//@see https://github.com/kubernetes/community/blob/master/contributors/devel/api-conventions.md
const uuid = require('node-uuid');
const _ = require('lodash');

const Lib = require('lib');
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
        this._logger = app.getLogger().child({service: "FlowOperator"});
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
    _getStepIdFromJob(job) {
        return job.spec.template.spec.containers[0].env.find((pair) => pair.name == 'ELASTICIO_STEP_ID').value;
    }

    _buildJobIndex(allJobs) {
        return allJobs.reduce((index, job) => {
            const flowId = this._getFlowIdFromJob(job);
            const stepId = this._getStepIdFromJob(job);
            index[flowId] = index[flowId] || {};
            index[flowId][stepId] = job;
            return index;
        }, {});
    }

    async _handleFlow(flow, jobsIndex, queuesStructure) {
        const flowModel = new Flow(flow);
        const flowId = flowModel.id;

        if (flow.metadata.deletionTimestamp) {
            this._logger.trace({name: flow.metadata.name}, 'Going to delete flow');
            for (let step of Object.values(jobsIndex[flowId] || {})) {
                this._logger.trace({flow: flow.metadata.name, step: step.metadata.name}, 'Going to delete flow step');
                await this._undeployJob({
                    metadata: {
                        name: step.metadata.name
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
            let totalRedeploy = Object.keys(flowModel.nodes).some((stepId) => {
                const job = jobsIndex[flowId] && jobsIndex[flowId][stepId];
                return job && (flowModel.metadata.resourceVersion !== job.metadata.annotations[ANNOTATION_KEY]);
             });
            totalRedeploy = totalRedeploy || _.difference(Object.keys(jobsIndex[flowId] || {}), (flowModel.nodes || []).map(node=>node.id)).length > 0; 

            if (totalRedeploy) {
                this._logger.trace({name: flow.metadata.name}, 'Flow changed. Redeploy');
                for (let step of Object.values(jobsIndex[flowId] || {})) {
                    this._logger.trace({flow: flow.metadata.name, step: step.metadata.name}, 'Going to delete flow step');
                    await this._undeployJob({
                        metadata: {
                            name: step.metadata.name
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
                for (let step of flowModel.nodes) {
                    this._logger.trace({flow: flow.metadata.name, step: step.id}, 'Going to create flow step');
                    await this._deployStep(flowModel, step, queues);
                }
            } else {
                this._logger.trace({name: flow.metadata.name}, 'Nothing changed. Ensure steps and queues exists');
                //TODO ensure queues/exchanges. Use QueuesStructure table
                const queues =  await this._queueCreator.makeQueuesForTheTask(flowModel);
                for (let step of flowModel.nodes) {
                    if (!jobsIndex[flowId] || !jobsIndex[flowId][step.id]) {
                        this._logger.trace({flow: flow.metadata.name, step: step.id}, 'Going to create flow step');
                        await this._deployStep(flowModel, step, queues);
                    }
                }
            }
        }
    }

    _buildFlowsIndex(allFlows) {
        return allFlows.reduce((index, flow) => {
            flow.flowModel = new Flow(flow);
            const flowId = flow.flowModel.id;
            (flow.flowModel.nodes || []).forEach((step) => {
                index[flowId] = index[flowId] || {};
                index[flowId][step.id] = step;
            });
            return index;
        }, {});
    }

    async _removeLostJobs(allJobs, allFlows) {
        const flowsIndex = this._buildFlowsIndex(allFlows);
        for (let job of allJobs) {
            const flowId = this._getFlowIdFromJob(job);
            const stepId = this._getStepIdFromJob(job);
            if (!flowsIndex[flowId] || !flowsIndex[flowId][stepId]) {
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
    
    _buildDescriptor(flow, step, queues) {
        let jobName = flow.id +'.'+ step.id;
        jobName = jobName.toLowerCase().replace(/[^0-9a-z]/g, '');
        const env = this._prepareEnvVars(flow, step, queues[step.id]);
        return this._generateAppDefinition(flow, jobName, env, step);
    }

    async _deployStep(flow, step, queues) {
        let jobName = flow.id +'.'+ step.id;
        jobName = jobName.toLowerCase().replace(/[^0-9a-z]/g, '');
        this._logger.info({jobName}, 'going to deploy job from k8s');
        const descriptor = this._buildDescriptor(flow, step, queues); 
        this._logger.trace(descriptor, 'going to deploy job from k8s');
        try {
            await this._batchClient.jobs.post({body: descriptor});
        } catch (e) {
            this._logger.error(e, 'failed to deploy job'); 
        }
    }

    _generateAppDefinition(flowModel, appId, envVars, step) {
        return {
            apiVersion: "batch/v1",
            kind: 'Job',
            metadata: {
                name: appId,
                namespace: "flows",
                annotations: {
                    [ANNOTATION_KEY]: flowModel.metadata.resourceVersion  
                },
                ownerReferences: [
                    {
                        apiVersion: "elastic.io/v1",                                     
                        kind: "Flow",
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
                            image: step.image,
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

    _prepareEnvVars(flow, step, stepQueues) {
        let envVars = Object.assign({}, stepQueues);
        envVars.EXEC_ID = uuid().replace(/-/g, '')
        envVars.STEP_ID = step.id;
        envVars.FLOW_ID = flow.id;
        envVars.USER_ID = 'FIXME hardcode smth here';
        envVars.COMP_ID = 'does not matter';
        envVars.FUNCTION = step.function;
        envVars.AMQP_URI = this._config.get('RABBITMQ_URI');
        envVars.API_URI = this._config.get('SELF_API_URI').replace(/\/$/, '');
    
        envVars.API_USERNAME = "does not matter";
        envVars.API_KEY = "does not matter";
        envVars = Object.entries(envVars).reduce((env, [k, v]) => {
            env['ELASTICIO_' + k] = v;
            return env;
        }, {});
        return Object.assign(envVars, step.env);
    }
}
module.exports = FlowOperator;
