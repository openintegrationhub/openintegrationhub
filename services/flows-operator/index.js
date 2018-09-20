/*eslint no-console: 0*/
//@see https://github.com/kubernetes/community/blob/master/contributors/devel/api-conventions.md
const express = require('express');
const uuid = require('node-uuid');
const _ = require('lodash');
const RabbitmqManagement = require('rabbitmq-stats');
const url = require('url');

const Lib = require('lib');
const { 
    QueueCreator,
    Flow,
    App,
    K8sService,
    AMQPService
} = Lib;
const ServiceConfig = require('./Config.js');

const SELF_URL= process.env.API_URI || 'http://api-service.platform.svc.cluster.local:1234';
const FINALIZER_NAME = 'finalizer.flows.elastic.io';
const ANNOTATION_KEY = 'annotation.flows.elastic.io';

class RabbitMQManagementService {
    constructor(app) {
        this._app = app; 
    }
    async start() {
        const managementUri = this._app.getConfig().get('RABBITMQ_MANAGEMENT_URI');
        const parsedUrl = new url.URL(managementUri);
        const {username, password } = parsedUrl;
        this._vhost = parsedUrl.pathname.replace(/^\//, '');
        parsedUrl.username = '';
        parsedUrl.password = '';
        this._client = new RabbitmqManagement(parsedUrl.toString(), username, password);
    }

    async getQueues() {
        return this._client.getVhostQueues(this._vhost); 
    } 
    async getExchanges() {
        return this._client.getVhostExchanges(this._vhost); 
    }
    async getBindings() {
        return this._client.getVhostBindings(this._vhost); 
    }
}

class HttpApi {
    constructor(app) {
        this._logger = app.getLogger().child({service: "HttpApi"});
        this._crdClient = app.getK8s().getCRDClient();
        this._app = express();
        this._app.get('/v1/tasks/:taskId/steps/:stepId', this._getStepInfo.bind(this));
        this._app.get('/healthcheck', this._healthcheck.bind(this));
    }
    listen(listenPort) {
        this._logger.info({port: listenPort}, 'Going to listen for http');
        this._app.listen(listenPort);
    }
    async _getStepInfo(req, res) {
        this._logger.trace(req.params, 'Step info request');
        try {
            const flow = await this._crdClient.flows(req.params.taskId).get();
            if (!flow) {
                throw new Error('404');
            }
            const flowModel = new Flow(flow.body);
            const step = flowModel.getRecipeNodeByStepId(req.params.stepId);
            if (!step) {
                throw new Error('404');
            }
            res.status(200);
            res.set('Content-Type', 'application/json');
            res.end(JSON.stringify({
                id: req.params.stepId,
                function: step.function,
                config: step.data || {}
            }));
        } catch (e) {
            this._logger.error(req.params, 'Step info request');
            res.status(500);
            res.end();
            return;
        }
    }
    async _healthcheck(req, res) {
        this._logger.trace('Healthcheck request');
        res.status(200).end(); 
    }
}


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

    async _handleFlow (flow, jobsIndex, queuesStructure) {
        const flowModel = new Flow(flow);
        const flowId = flowModel.id;
        //if revision has been changed then -- then undeploy everything, and redeploy again
        //if marked as deleted -- kill them all
        //if there are not enough running jobs -- start missing. 
        //"deletionGracePeriodSeconds": 0,               
        //"deletionTimestamp": "2018-09-13T09:54:10Z",   
        if (flow.metadata.deletionTimestamp) {
            console.log('destroy flow');
            for (let step of Object.values(jobsIndex[flowId] || {})) {
                console.log('going to un deploy for total replace', step.metadata.name);
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
            await this._queueCreator.destroyQueuesForTask(flowModel);

            flow.metadata.finalizers = (flow.metadata.finalizers || []).filter(finalizer => finalizer !== FINALIZER_NAME);
            //FIXME make sure 409 works. So non-sequential updates should go into next iteration
            //possibly handle revision field
            await this._crdClient.flow(flowModel.id).put({
                body: flow 
            });
        } else {
            if (!(flow.metadata.finalizers || []).includes(FINALIZER_NAME)) {
                flow.metadata.finalizers = (flow.metadata.finalizers || []).concat(FINALIZER_NAME);
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

            console.log('version mismatch redeploy', totalRedeploy);
            totalRedeploy = totalRedeploy || _.difference(Object.keys(jobsIndex[flowId] || {}), (flowModel.nodes || []).map(node=>node.id)).length > 0;
            console.log('structure mismatch redeply', totalRedeploy);

            if (totalRedeploy) {
                console.log('total redeploy');
                for (let step of Object.values(jobsIndex[flowId] || {})) {
                    console.log('going to un deploy for total replace', flowId.id, step.id);
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
                    console.log('going to deploy', flowModel.id, step.id);
                    await this._deployStep(flowModel, step, queues);
                }
            } else {
                console.log('ensure flow/queues');
                //FIXME ensure queues/exchanges. Use QueuesStructure table
                const queues =  await this._queueCreator.makeQueuesForTheTask(flowModel);
                for (let step of flowModel.nodes) {
                    if (!jobsIndex[flowId] || !jobsIndex[flowId][step.id]) {
                        console.log('going to deploy', flowModel.id, step.id);
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

    _mqIndex(queues, exchanges, bindings) {
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
        const queuesStructure = this._mqIndex(queues, exchanges, bindings);
        const flows = (await this._crdClient.flows.get()).body.items;
        for (let flow of flows) {
            await this._handleFlow(flow, jobIndex, queuesStructure);
        }
        //await this._removeLostJobs(allJobs, flows);
    }

    async _undeployJob(job) {
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
        envVars.API_URI = SELF_URL.replace(/\/$/, '');
    
        envVars.API_USERNAME = "does not matter";
        envVars.API_KEY = "does not matter";
        envVars = Object.entries(envVars).reduce((env, [k, v]) => {
            env['ELASTICIO_' + k] = v;
            return env;
        }, {});
        return Object.assign(envVars, step.env);
    }

}

class FlowOperatorApp extends App {
    constructor() {
        super(...arguments);
        this._config = new ServiceConfig();
    }
    async _run() {
        this._amqp = new AMQPService(this);
        this._rabbitmqManagement = new RabbitMQManagementService(this);
        await this._rabbitmqManagement.start();
        this._k8s = new K8sService(this);
        await this._amqp.start();
        await this._k8s.start();
        this._httpApi = new HttpApi(this);
        this._httpApi.listen(this.getConfig().get('LISTEN_PORT'));
        const channel = await this._amqp.getConnection().createChannel();
        this._queueCreator = new QueueCreator(channel);
        new FlowOperator(this);
    }

    getK8s() {
        return this._k8s;
    }

    getQueueCreator() {
        return this._queueCreator;
    }

    getRabbitmqManagement() {
        return this._rabbitmqManagement;
    }

    getAmqp() {
        return this._amqp;
    }

    static get NAME() {
        return 'flows-operator';
    }
}

(async () => {
    try {
        const app = new FlowOperatorApp();
        await app.start();
    } catch (e) {
        console.error('Critical error, going to die', e, e && e.stack); //eslint-disable-line
        process.exit(1);
    }
})();
