//@see https://github.com/kubernetes/community/blob/master/contributors/devel/api-conventions.md
const uuid = require('node-uuid');
const _ = require('lodash');
const { URL } = require('url');

const Lib = require('backendCommonsLib');
const { Flow, FlowSecret } = Lib;

const FLOW_FINALIZER_NAME = 'finalizer.flows.elastic.io';
const ANNOTATION_KEY = 'annotation.flows.elastic.io';

async function loop (body, logger, loopInterval) {
    logger.info('loop TICK');
    try {
        await body();
    } catch (e) {
        logger.error(e, 'loop body error');
    }
    setTimeout(async () => {
        loop(body, logger, loopInterval);
    }, loopInterval);
}
class FlowOperator {
    constructor(app) {
        this._logger = app.getLogger().child({service: 'FlowOperator'});
        this._crdClient = app.getK8s().getCRDClient();
        this._batchClient = app.getK8s().getBatchClient();
        this._coreClient = app.getK8s().getCoreClient();
        this._queueCreator = app.getQueueCreator();
        this._rabbitmqManagement = app.getRabbitmqManagement();
        this._config = app.getConfig();
        this._channelPromise = app.getAmqp().getConnection().createChannel();
        loop(this._loopBody.bind(this), this._logger, 5000);
    }
    _getFlowIdFromJob(job) {
        return job.spec.template.spec.containers[0].env.find((pair) => pair.name == 'ELASTICIO_FLOW_ID').value;
    }
    _getNodeIdFromJob(job) {
        return job.spec.template.spec.containers[0].env.find((pair) => pair.name == 'ELASTICIO_STEP_ID').value;
    }

    _buildJobIndex(allJobs) {
        return allJobs.reduce((index, job) => {
            const flowId = this._getFlowIdFromJob(job);
            const nodeId = this._getNodeIdFromJob(job);
            index[flowId] = index[flowId] || {};
            index[flowId][nodeId] = job;
            return index;
        }, {});
    }

    async _handleFlow(flowCrd, jobsIndex, queuesStructure) {
        const flow = new Flow(flowCrd);
        const flowId = flow.id;

        if (flow.metadata.deletionTimestamp) {
            this._logger.trace({name: flow.metadata.name}, 'Going to delete flow');
            for (let node of Object.values(jobsIndex[flowId] || {})) {
                this._logger.trace({flow: flow.metadata.name, node: node.metadata.name}, 'Going to delete flow node');
                await this._undeployJob({
                    metadata: {
                        name: node.metadata.name
                    }
                });
            }
            if (queuesStructure[flowId]) {
                const channel = await this._channelPromise;
                for (let queue of queuesStructure[flowId].queues) {
                    await channel.deleteQueue(queue);
                }
                for (let exchange of queuesStructure[flowId].exchanges) {
                    await channel.deleteExchange(exchange);
                }
                await this._deleteFlowSecret(flow);
            }

            flow.metadata.finalizers = (flow.metadata.finalizers || []).filter(finalizer => finalizer !== FLOW_FINALIZER_NAME);
            //FIXME make sure 409 works. So non-sequential updates should go into next iteration
            //possibly handle revision field
            await this._crdClient.flow(flow.id).put({
                body: flow
            });
        } else {
            if (!(flow.metadata.finalizers || []).includes(FLOW_FINALIZER_NAME)) {
                flow.metadata.finalizers = (flow.metadata.finalizers || []).concat(FLOW_FINALIZER_NAME);
                //FIXME make sure 409 works. So non-sequential updates should go into next iteration
                //possibly handle revision field
                await this._crdClient.flow(flow.id).put({
                    body: flow.toCRD()
                });
            }

            let totalRedeploy = Object.keys(flow.nodes).some((nodeId) => {
                const job = jobsIndex[flowId] && jobsIndex[flowId][nodeId];
                return job && (flow.metadata.resourceVersion !== job.metadata.annotations[ANNOTATION_KEY]);
             });
            totalRedeploy = totalRedeploy || _.difference(Object.keys(jobsIndex[flowId] || {}), (flow.nodes || []).map(node=>node.id)).length > 0;

            if (totalRedeploy) {
                this._logger.trace({name: flow.metadata.name}, 'Flow changed. Redeploy');
                for (let node of Object.values(jobsIndex[flowId] || {})) {
                    this._logger.trace({flow: flow.metadata.name, node: node.metadata.name}, 'Going to delete flow node');
                    await this._undeployJob({
                        metadata: {
                            name: node.metadata.name
                        }
                    });
                }
                if (queuesStructure[flowId]) {
                    const channel = await this._channelPromise;
                    for (let queue of queuesStructure[flowId].queues) {
                        await channel.deleteQueue(queue);
                    }
                    for (let exchange of queuesStructure[flowId].exchanges) {
                        await channel.deleteExchange(exchange);
                    }
                }
                const queues =  await this._queueCreator.makeQueuesForTheFlow(flow);
                for (let node of flow.nodes) {
                    this._logger.trace({flow: flow.metadata.name, node: node.id}, 'Going to create flow node');
                    await this._deployNode(flow, node, queues);
                }
            } else {
                this._logger.trace({name: flow.metadata.name}, 'Nothing changed. Ensure nodes and queues exists');

                if (!jobsIndex[flowId]) {
                    const flowSecret = await this._getFlowSecret(flow);
                    if (!flowSecret) {
                        await this._createFlowSecret(flow);
                    } else {
                        this._logger.debug('Found flow secret ID', flowSecret.id);
                    }
                }

                //TODO ensure queues/exchanges. Use QueuesStructure table
                const queues =  await this._queueCreator.makeQueuesForTheFlow(flow);
                for (let node of flow.nodes) {
                    if (!jobsIndex[flowId] || !jobsIndex[flowId][node.id]) {
                        this._logger.trace({flow: flow.metadata.name, node: node.id}, 'Going to create flow node');
                        await this._deployNode(flow, node, queues);
                    }
                }
            }
        }
    }

    _buildFlowsIndex(allFlows) {
        return allFlows.reduce((index, flow) => {
            flow.flowModel = new Flow(flow);
            const flowId = flow.flowModel.id;
            (flow.flowModel.nodes || []).forEach((node) => {
                index[flowId] = index[flowId] || {};
                index[flowId][node.id] = node;
            });
            return index;
        }, {});
    }

    async _removeLostJobs(allJobs, allFlows) {
        const flowsIndex = this._buildFlowsIndex(allFlows);
        for (let job of allJobs) {
            const flowId = this._getFlowIdFromJob(job);
            const nodeId = this._getNodeIdFromJob(job);
            if (!flowsIndex[flowId] || !flowsIndex[flowId][nodeId]) {
                await this._undeployJob(job);
            }
        }
    }

    _buildMQInedx(queues, exchanges, bindings) {
        const index = {};
        for (let queue of queues) {
            const name = queue.name;
            const flowId = name.split(':')[0];
            index[flowId] = index[flowId] || {queues: [], exchanges: [], bindings: []};
            index[flowId].queues.push(name);
        }
        for (let exchange of exchanges) {
            const flowId = exchange.name;
            index[flowId] = index[flowId] || {queues: [], exchanges: [], bindings: []};
            index[flowId].exchanges.push(exchange.name);
        }
        for (let binding of bindings) {
            const queueName = binding.destination;
            const flowId = queueName.split(':')[0];
            index[flowId] = index[flowId] || {queues: [], exchanges: [], bindings: []};
            index[flowId].bindings.push(binding);
        }
        return index;
    }

    async _loopBody() {
        //TODO any step here blocks all the job, that's shit. Timeouts, multiple execution threads with limits for
        //parallel jobs not to destroy backend;
        const allJobs = (await this._batchClient.jobs.get()).body.items;
        const jobIndex = this._buildJobIndex(allJobs);
        const queues = await this._rabbitmqManagement.getQueues();
        const exchanges = await this._rabbitmqManagement.getExchanges();
        const bindings = await this._rabbitmqManagement.getBindings();
        const queuesStructure = this._buildMQInedx(queues, exchanges, bindings);
        const flows = (await this._crdClient.flows.get()).body.items;
        for (let flow of flows) {
            await this._handleFlow(flow, jobIndex, queuesStructure);
        }
        await this._removeLostJobs(allJobs, flows);
    }

    async _undeployJob(job) {
        //TODO wait until job really will be deleted
        this._logger.info({name: job.metadata.name}, 'going to undeploy job from k8s');
        try {
            await this._batchClient.jobs.delete({
                name: job.metadata.name,
                body: {
                    kind: 'DeleteOptions',
                    apiVersion: 'batch/v1',
                    propagationPolicy: 'Foreground'
                }
            });
        } catch (e) {
            this._logger.error(e, 'failed to undeploy job');
        }
    }

    _buildDescriptor(flow, node, queues) {
        let jobName = flow.id +'.'+ node.id;
        jobName = jobName.toLowerCase().replace(/[^0-9a-z]/g, '');
        const env = this._prepareEnvVars(flow, node, queues[node.id]);
        return this._generateAppDefinition(flow, jobName, env, node);
    }

    async _deployNode(flow, node, queues) {
        let jobName = flow.id +'.'+ node.id;
        jobName = jobName.toLowerCase().replace(/[^0-9a-z]/g, '');
        this._logger.info({jobName}, 'Going to deploy job to k8s');
        const descriptor = this._buildDescriptor(flow, node, queues);
        this._logger.trace(descriptor, 'going to deploy a job to k8s');
        try {
            await this._batchClient.jobs.post({body: descriptor});
        } catch (e) {
            this._logger.error(e, 'Failed to deploy the job');
        }
    }

    _generateAppDefinition(flowModel, appId, envVars, node) {
        const env = Object.keys(envVars).map(key => ({
            name: key,
            value: envVars[key]
        }));

        env.push({
            name: 'ELASTICIO_AMQP_URI',
            valueFrom: {
                secretKeyRef: {
                    name: flowModel.id,
                    key: 'AMQP_URI'
                }
            }
        });

        return {
            apiVersion: 'batch/v1',
            kind: 'Job',
            metadata: {
                name: appId,
                namespace: this._config.get('NAMESPACE'),
                annotations: {
                    [ANNOTATION_KEY]: flowModel.metadata.resourceVersion
                },
                ownerReferences: [
                    {
                        apiVersion: 'elastic.io/v1',
                        kind: 'Flow',
                        controller: true,
                        name: flowModel.metadata.name,
                        uid: flowModel.metadata.uid
                    }
                ]
            },
            spec: {
                template: {
                    metadata: {
                        labels: {}
                    },
                    spec: {
                        restartPolicy: 'Never',
                        containers: [{
                            image: node.image,
                            name: 'apprunner',
                            imagePullPolicy: 'Always',
                            env,
                            resources: this._prepareResourcesDefinition(flowModel, node)
                        }]
                    }
                }
            }
        };
    }

    _prepareResourcesDefinition(flow, node) {
        const lc = 'resources.limits.cpu';
        const lm = 'resources.limits.memory';
        const rc = 'resources.requests.cpu';
        const rm = 'resources.requests.memory';

        const cpuLimit = _.get(node, lc) || _.get(flow, lc) || this._config.get('DEFAULT_CPU_LIMIT');
        const memLimit = _.get(node, lm) || _.get(flow, lm) || this._config.get('DEFAULT_MEM_LIMIT');
        const cpuRequest = _.get(node, rc) || _.get(flow, rc) || this._config.get('DEFAULT_CPU_REQUEST');
        const memRequest = _.get(node, rm) || _.get(flow, rm) || this._config.get('DEFAULT_MEM_REQUEST');

        return {
            limits: {
                cpu: cpuLimit,
                memory: memLimit
            },
            requests: {
                cpu: cpuRequest,
                memory: memRequest
            }
        };
    }

    _prepareEnvVars(flow, node, nodeQueues) {
        let envVars = Object.assign({}, nodeQueues);
        envVars.EXEC_ID = uuid().replace(/-/g, '');
        envVars.STEP_ID = node.id;
        envVars.FLOW_ID = flow.id;
        envVars.USER_ID = 'FIXME hardcode smth here';
        envVars.COMP_ID = 'does not matter';
        envVars.FUNCTION = node.function;
        envVars.API_URI = this._config.get('SELF_API_URI').replace(/\/$/, '');

        envVars.API_USERNAME = 'does not matter';
        envVars.API_KEY = 'does not matter';
        envVars = Object.entries(envVars).reduce((env, [k, v]) => {
            env['ELASTICIO_' + k] = v;
            return env;
        }, {});
        return Object.assign(envVars, node.env);
    }

    async _createFlowSecret(flow) {
        this._logger.debug('About to create a secret');
        const credentials = await this._createAmqpCredentials(flow);

        const flowSecret = new FlowSecret({
            metadata: {
                name: flow.id,
                namespace: this._config.get('NAMESPACE')
            },
            data: {
                AMQP_URI: this._prepareAmqpUri(credentials)
            }
        });

        await this._coreClient.secrets.post({
            body: flowSecret.toDescriptor()
        });

        this._logger.debug('Secret has been created');
    }

    async _deleteFlowSecret(flow) {
        this._logger.debug('About to delete a secret');
        const secret = await this._getFlowSecret(flow);
        if (!secret) {
            return;
        }

        const username = secret.amqpUsername;
        await this._deleteAmqpCredentials({ username });
        this._logger.trace('Removed AMQP credentials');

        await this._coreClient.secrets(secret.id).delete();
        this._logger.debug('Secret has been deleted');
    }

    async _getFlowSecret(flow) {
        try {
            const result = await this._coreClient.secrets(flow.id).get();
            return FlowSecret.fromDescriptor(result.body);
        } catch (e) {
            return null;
        }
    }

    _prepareAmqpUri({ username, password }) {
        const baseUri = new URL(this._config.get('RABBITMQ_URI_FLOWS'));
        baseUri.username = username;
        baseUri.password = password;

        return baseUri.toString();
    }

    async _createAmqpCredentials(flow) {
        const username = uuid.v4(); //@todo: use flow.id as a username?
        const password = uuid.v4();

        this._logger.trace('About to create RabbitMQ user');
        await this._rabbitmqManagement.createFlowUser({
            username,
            password,
            flow
        });
        this._logger.trace('Created RabbitMQ user');

        return {
            username,
            password
        };
    }

    async _deleteAmqpCredentials(credentials) {
        await this._rabbitmqManagement.deleteUser(credentials);
    }
}

module.exports = FlowOperator;
