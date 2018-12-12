//@see https://github.com/kubernetes/community/blob/master/contributors/devel/api-conventions.md
const uuid = require('uuid/v4');
const _ = require('lodash');
const { URL } = require('url');

const Lib = require('backendCommonsLib');
const { FlowSecret } = Lib;

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
    constructor(config, logger, k8s, queueCreator, rabbitmqManagement, amqpConnection, flowsDao, driver) {
        this._logger = logger.child({service: 'FlowOperator'});
        this._coreClient = k8s.getCoreClient();
        this._queueCreator = queueCreator;
        this._rabbitmqManagement = rabbitmqManagement;
        this._config = config;
        this._channelPromise = amqpConnection.createChannel();
        this._flowsDao =  flowsDao;
        this._driver = driver;
    }

    start() {
        loop(this._loopBody.bind(this), this._logger, 5000);
    }

    async _loopBody() {
        //TODO any step here blocks all the job, that's shit. Timeouts, multiple execution threads with limits for
        //parallel jobs not to destroy backend;
        const allJobs = await this._driver.getAppList();
        const jobIndex = this._buildJobIndex(allJobs);
        const queues = await this._rabbitmqManagement.getQueues();
        const exchanges = await this._rabbitmqManagement.getExchanges();
        const bindings = await this._rabbitmqManagement.getBindings();
        const queuesStructure = this._buildMQIndex(queues, exchanges, bindings);
        const flows = await this._flowsDao.findAll();
        for (let flow of flows) {
            await this._handleFlow(flow, jobIndex, queuesStructure);
        }
        await this._removeLostJobs(allJobs, flows);
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

    async _handleFlow(flow, jobsIndex, queuesStructure) {
        const flowId = flow.id;

        if (flow.metadata.deletionTimestamp) {
            this._logger.trace({name: flow.metadata.name}, 'Going to delete flow');
            for (let node of Object.values(jobsIndex[flowId] || {})) {
                this._logger.trace({flow: flow.metadata.name, node: node.metadata.name}, 'Going to delete flow node');
                await this._driver.destroyApp(node.metadata.name);
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

            await this._deleteFlowSecret(flow);

            flow.metadata.finalizers = (flow.metadata.finalizers || []).filter(finalizer => finalizer !== FLOW_FINALIZER_NAME);
            //FIXME make sure 409 works. So non-sequential updates should go into next iteration
            //possibly handle revision field
            this._flowsDao.update(flow);
        } else {
            if (!(flow.metadata.finalizers || []).includes(FLOW_FINALIZER_NAME)) {
                flow.metadata.finalizers = (flow.metadata.finalizers || []).concat(FLOW_FINALIZER_NAME);
                //FIXME make sure 409 works. So non-sequential updates should go into next iteration
                //possibly handle revision field
                await this._flowsDao.update(flow);
            }

            //@todo: optimise it in the future
            const flowSecret = await this._getFlowSecret(flow);
            if (!flowSecret) {
                await this._createFlowSecret(flow);
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
                    await this._driver.destroyApp(node.metadata.name);
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
                    await this._driver.createApp(flow, node, queues);
                }
            } else {
                this._logger.trace({name: flow.metadata.name}, 'Nothing changed. Ensure nodes and queues exists');

                //TODO ensure queues/exchanges. Use QueuesStructure table
                const queues =  await this._queueCreator.makeQueuesForTheFlow(flow);
                for (let node of flow.nodes) {
                    if (!jobsIndex[flowId] || !jobsIndex[flowId][node.id]) {
                        this._logger.trace({flow: flow.metadata.name, node: node.id}, 'Going to create flow node');
                        await this._driver.createApp(flow, node, queues);
                    }
                }
            }
        }
    }

    async _removeLostJobs(allJobs, allFlows) {
        const flowsIndex = this._buildFlowsIndex(allFlows);
        for (let job of allJobs) {
            const flowId = this._getFlowIdFromJob(job);
            const nodeId = this._getNodeIdFromJob(job);
            if (!flowsIndex[flowId] || !flowsIndex[flowId][nodeId]) {
                await this._driver.destroyApp(job.metadata.name);
            }
        }
    }

    _buildFlowsIndex(allFlows) {
        return allFlows.reduce((index, flow) => {
            const flowId = flow.id;
            (flow.nodes || []).forEach((node) => {
                index[flowId] = index[flowId] || {};
                index[flowId][node.id] = node;
            });
            return index;
        }, {});
    }

    _getFlowIdFromJob(job) {
        return job.spec.template.spec.containers[0].env.find((pair) => pair.name === 'ELASTICIO_FLOW_ID').value;
    }

    _getNodeIdFromJob(job) {
        return job.spec.template.spec.containers[0].env.find((pair) => pair.name === 'ELASTICIO_STEP_ID').value;
    }

    _buildMQIndex(queues, exchanges, bindings) {
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

    async _createFlowSecret(flow) {
        this._logger.debug('About to create a secret');
        const credentials = await this._createAmqpCredentials(flow);

        const flowSecret = new FlowSecret({
            metadata: {
                name: flow.id,
                namespace: this._config.get('NAMESPACE'),
                ownerReferences: [
                    {
                        apiVersion: 'elastic.io/v1',
                        kind: 'Flow',
                        controller: true,
                        name: flow.metadata.name,
                        uid: flow.metadata.uid
                    }
                ]
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
            if (e.statusCode === 404) {
                return null;
            }
            throw e;
        }
    }

    _prepareAmqpUri({ username, password }) {
        const baseUri = new URL(this._config.get('RABBITMQ_URI_FLOWS'));
        baseUri.username = username;
        baseUri.password = password;

        return baseUri.toString();
    }

    async _createAmqpCredentials(flow) {
        const username = flow.id;
        const password = uuid();

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
