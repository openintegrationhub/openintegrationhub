//@see https://github.com/kubernetes/community/blob/master/contributors/devel/api-conventions.md
const uuid = require('node-uuid');
const _ = require('lodash');

const Lib = require('backendCommonsLib');
const { Flow } = Lib;

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

    async _handleFlow(flow, jobsIndex, queuesStructure) {
        const flowModel = new Flow(flow);
        const flowId = flowModel.id;

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
            } 

            flow.metadata.finalizers = (flow.metadata.finalizers || []).filter(finalizer => finalizer !== FLOW_FINALIZER_NAME);
            //FIXME make sure 409 works. So non-sequential updates should go into next iteration
            //possibly handle revision field
            await this._crdClient.flow(flowModel.id).put({
                body: flow 
            });
        } else {
            if (!(flow.metadata.finalizers || []).includes(FLOW_FINALIZER_NAME)) {
                flow.metadata.finalizers = (flow.metadata.finalizers || []).concat(FLOW_FINALIZER_NAME);
                //FIXME make sure 409 works. So non-sequential updates should go into next iteration
                //possibly handle revision field
                await this._crdClient.flow(flowModel.id).put({
                    body: flowModel.toCRD()
                });
            }
            let totalRedeploy = Object.keys(flowModel.nodes).some((nodeId) => {
                const job = jobsIndex[flowId] && jobsIndex[flowId][nodeId];
                return job && (flowModel.metadata.resourceVersion !== job.metadata.annotations[ANNOTATION_KEY]);
             });
            totalRedeploy = totalRedeploy || _.difference(Object.keys(jobsIndex[flowId] || {}), (flowModel.nodes || []).map(node=>node.id)).length > 0; 

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
                const queues =  await this._queueCreator.makeQueuesForTheTask(flowModel);
                for (let node of flowModel.nodes) {
                    this._logger.trace({flow: flow.metadata.name, node: node.id}, 'Going to create flow node');
                    await this._deployNode(flowModel, node, queues);
                }
            } else {
                this._logger.trace({name: flow.metadata.name}, 'Nothing changed. Ensure nodes and queues exists');
                //TODO ensure queues/exchanges. Use QueuesStructure table
                const queues =  await this._queueCreator.makeQueuesForTheTask(flowModel);
                for (let node of flowModel.nodes) {
                    if (!jobsIndex[flowId] || !jobsIndex[flowId][node.id]) {
                        this._logger.trace({flow: flow.metadata.name, node: node.id}, 'Going to create flow node');
                        await this._deployNode(flowModel, node, queues);
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
        //TODO any step here blocks all the job, that's shit. Tiemouts, multiple execution threads with limits for 
        //paralel jobs not to destroy backend;
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
        this._logger.info({jobName}, 'going to deploy job from k8s');
        const descriptor = this._buildDescriptor(flow, node, queues); 
        this._logger.trace(descriptor, 'going to deploy job from k8s');
        try {
            await this._batchClient.jobs.post({body: descriptor});
        } catch (e) {
            this._logger.error(e, 'failed to deploy job'); 
        }
    }

    _generateAppDefinition(flowModel, appId, envVars, node) {
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
                            env: Object.keys(envVars).map(key => ({
                                name: key,
                                value: envVars[key]
                            }))
                        }]
                    }
                }
            }
        };
    }

    _prepareEnvVars(flow, node, nodeQueues) {
        let envVars = Object.assign({}, nodeQueues);
        envVars.EXEC_ID = uuid().replace(/-/g, '')
        envVars.STEP_ID = node.id;
        envVars.FLOW_ID = flow.id;
        envVars.USER_ID = 'FIXME hardcode smth here';
        envVars.COMP_ID = 'does not matter';
        envVars.FUNCTION = node.function;
        envVars.AMQP_URI = this._config.get('RABBITMQ_URI');
        envVars.API_URI = this._config.get('SELF_API_URI').replace(/\/$/, '');
    
        envVars.API_USERNAME = 'does not matter';
        envVars.API_KEY = 'does not matter';
        envVars = Object.entries(envVars).reduce((env, [k, v]) => {
            env['ELASTICIO_' + k] = v;
            return env;
        }, {});
        return Object.assign(envVars, node.env);
    }
}
module.exports = FlowOperator;
