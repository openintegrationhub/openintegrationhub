const express = require('express');
const K8sApi = require('kubernetes-client');
const {Client, Batch, config} = K8sApi;
const uuid = require('node-uuid');
const amqp = require('amqplib');
const bunyan = require('bunyan');

const  QueueCreator = require('./QueueCreator.js');

const LISTEN_PORT = process.env.LISTEN_PORT || 1234
const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqp://guest:guest@127.0.0.1:5672/';
const SELF_URL= process.env.API_URI || 'http://api-service.platform.svc.cluster.local:1234';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const CRD = {
    "apiVersion": "apiextensions.k8s.io/v1beta1",
    "kind": "CustomResourceDefinition",
    "metadata": {
        "name": "flows.elastic.io"
    },
    "spec": {
        "group": "elastic.io",
        "names": {
            "kind": "Flow",
            "listKind": "FlowList",
            "plural": "flows",
            "shortNames": [],
            "singular": "flow"
        },
        "scope": "Namespaced",
        "version": "v1"
    }
};

class Flow {
    constructor(crd) {
        this.id = crd.metadata.name;
        this.metadata = crd.metadata;
        Object.assign(this, crd.spec); 
    }
    getFirstNode() {
        return this.nodes.find((step) => step.first);
    }
    getRecipeNodeByStepId(stepId) {
        return this.nodes.find((step) => step.id === stepId);
    }
    toCRD() {
        const spec = Object.assign({}, this);
        delete spec.id;
        delete spec.metadata;
        return {
            apiVersion: "elastic.io/v1",
            kind: "Flow",
            metadata: this.metadata,
            spec: spec
        };    
    }
}

class HttpApi {
    constructor(crdClient) {
        this._logger = bunyan({name: "HttpApi", level: LOG_LEVEL});
        this._crdClient = crdClient;
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
    constructor(crdClient, batchClient, queueCreator) {
        this._logger = bunyan({name: "FlowOperator", level: LOG_LEVEL});
        this._crdClient = crdClient;
        this._batchClient = batchClient;
        this._queueCreator = queueCreator;
        loop(this._loopBody.bind(this), this._logger, 5000);
    }
    _getFlowIdFromJob(job) {
        return job.spec.template.spec.containers[0].env.find((pair) => pair.name == 'ELASTICIO_FLOW_ID').value;
    }
    _getStepIdFromJob(job) {
        return job.spec.template.spec.containers[0].env.find((pair) => pair.name == 'ELASTICIO_STEP_ID').value;
    }

    async _loopBody() {
        const allJobs = (await this._batchClient.jobs.get()).items;
        const jobsIndex = allJobs.reduce((index, job) => {
            const flowId = this._getFlowIdFromJob(job);
            const stepId = this._getStepIdFromJob(job);
            index[flowId] = index[flowId] || {};
            index[flowId][stepId] = job;
            return index;
        }, {});
        const flows = (await this._crdClient.flows.get()).body.items;
        const flowsIndex = flows.reduce((index, flow) => {
            flow.flowModel = new Flow(flow);
            const flowId = flow.flowModel.id;
            (flow.flowModel.nodes || []).forEach((step) => {
                index[flowId] = index[flowId] || {};
                index[flowId][step.id] = step;
            });
            return index;
        }, {});
        for (let flow of flows) {
            const queues =  await this._queueCreator.makeQueuesForTheTask(flow.flowModel);
            const flowId = flow.flowModel.id;
            for (let step of flow.flowModel.nodes) {
                if (!jobsIndex[flowId] || !jobsIndex[flowId][step.id]) {
                    await this._deployStep(flow.flowModel, step, queues);
                }
            }
        }
        for (let job of allJobs) {
            const flowId = this._getFlowIdFromJob(job);
            const stepId = this._getStepIdFromJob(job);
            if (!flowsIndex[flowId] || !flowsIndex[flowId][stepId]) {
                await this._undeployJob(job);    
            }        
        }
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

    async _deployStep(flow, step, queues) {
        let jobName = flow.id +'.'+ step.id;
        jobName = jobName.toLowerCase().replace(/[^0-9a-z]/g, '');
        this._logger.info({jobName}, 'going to deploy job from k8s');
        let env = this._prepareEnvVars(flow, step, queues[step.id]);
        const descriptor = this._generateAppDefinition(jobName, env, step);
        this._logger.trace(descriptor, 'going to deploy job from k8s');
        try {
            await this._batchClient.jobs.post({body: descriptor});
        } catch (e) {
            this._logger.error(e, 'failed to deploy job'); 
        }
    }

    _generateAppDefinition(appId, envVars, step) {
        return {
            apiVersion: "batch/v1",
            kind: 'Job',
            metadata: {
                name: appId,
                namespace: "flows"
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
        envVars.AMQP_URI = RABBITMQ_URI;
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

async function waitConnectAmqp(amqpUri, logger) {
    let counter = 0;
    while (counter < 100) {
        counter++;
        logger.info({amqpUri}, 'Going to connect to amqp');
        try {
            return await Promise.race([
                amqp.connect(amqpUri),
                new Promise((res, rej) => setTimeout(rej.bind(null, new Error('Timeout')), 1000))
            ]);
        } catch (e) {
            logger.error(e, 'Failed to connect to Rabbitmq, retry in 1sec');
            await new Promise(res => setTimeout(res, 1000));
        }
    }
    logger.error('Give up connecting to rabbitmq');
    throw new Error('can not connect to rabbitmq');
}

async function init (logger) {
    let k8sConnConfig;
    try {
        logger.info('going to get incluster config');
        k8sConnConfig =  config.getInCluster();
    } catch (e) {
        logger.info('going to get k8s config from ~/.kube/config');
        k8sConnConfig = config.fromKubeconfig();
    }

    const client = new Client({config: k8sConnConfig, version: '1.9'});

    try {
        await client.apis['apiextensions.k8s.io'].v1beta1.customresourcedefinitions.post({ body: CRD });
    } catch (e) {
        if (e.message.indexOf('already exists') !== -1) {
            logger.info('crd already exists');
        } else {
            logger.error(e, 'failed to crate crd');
            throw e;
        }
    }

    client.addCustomResourceDefinition(CRD);
    const crdClient = client.apis['elastic.io'].v1.namespaces('flows');
    const batchClient = (new Batch(k8sConnConfig)).namespaces('flows');
    const httpApi = new HttpApi(crdClient);
    httpApi.listen(LISTEN_PORT);
    const amqpConn = await waitConnectAmqp(RABBITMQ_URI, logger);
    const channel = await amqpConn.createChannel();
    const queueCreator = new QueueCreator(channel);
    new FlowOperator(crdClient, batchClient, queueCreator);
}

(async () => {
    const logger = bunyan({name: 'startup', level: LOG_LEVEL});
    try {
        logger.info('Starting platform');
        await init(logger);
    } catch (e) {
        logger.error(e, 'failed to start platform');
        process.exit(1);
    }
})();
