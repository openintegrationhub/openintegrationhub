const K8sApi = require('kubernetes-client');
const {Client, config} = K8sApi;
const uuid = require('node-uuid');
const amqp = require('amqplib');
const bunyan = require('bunyan');
const express = require('express');

const QueueCreator = require('./QueueCreator.js');

const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqp://guest:guest@127.0.0.1:5672/';
const LISTEN_PORT = process.env.LISTEN_PORT || 1235;
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

class Scheduler {
    constructor(crdClient, queueCreator, amqpChannel) {
        this._logger = bunyan({name: "Scheduler", level: LOG_LEVEL});
        this._crdClient = crdClient;
        this._channel = amqpChannel;
        this._queueCreator = queueCreator;
        loop(this._loopBody.bind(this), this._logger, 5000);
    }
    async _scheduleOne(flow) {
        this._logger.trace({flowId: flow.id}, 'schedule flow tick');
         
        const scheduleRecord = {
            'taskId': flow.id,
            'execId': uuid().replace(/-/g, ''),
            'userId': "DOES NOT MATTER"
        };
        const msg = {
            id: uuid.v1(),
            attachments: {},
            body: {},
            headers: {},
            metadata: {}
        };

        await this._channel.sendToQueue(
            this._queueCreator.getAmqpStepConfig(flow, flow.getFirstNode().id).messagesQueue,
            Buffer.from(JSON.stringify(msg)),
            {
                headers:  scheduleRecord
            }
        );
    }
    async _loopBody() {
        const flows = (await this._crdClient.flows.get()).body.items;
        const now = new Date();
        for (let flow of flows) {
            const flowModel = new Flow(flow);
            const firstStep = flowModel.getFirstNode();
            if (!firstStep || !firstStep.isPolling) {
                this._logger.trace({flowId: flowModel.id}, 'flow is not polling, skip');
                continue;
            }
            if (!flowModel.dueExecution || now >= new Date(flowModel.dueExecution)) { 
                try {
                    await this._scheduleOne(flowModel);

                    flowModel.dueExecution = new Date();
                    flowModel.dueExecution.setMinutes(flowModel.dueExecution.getMinutes(), 3);
                    this._logger.trace({flowId: flowModel.id, dueExecution: flowModel.dueExecution}, 'schedule next flow tick');
                    await this._crdClient.flow(flowModel.id).put(
                        {
                            body: flowModel.toCRD()
                        }
                    );
                 } catch (e) {
                     this._logger.error(e, 'failed to schedule flow run');
                 }
            } else {
                 this._logger.trace({flowId: flowModel.id, dueExecution: flowModel.dueExecution}, 'skip schedule');
            }
        }
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


function initHealthcheckApi(listenPort) {
    const app = express();
    app.get('/healthcheck', (req, res) => {
        res.status(200).end(); 
    });
    app.listen(listenPort);
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
    const amqpConn = await waitConnectAmqp(RABBITMQ_URI, logger);
    const channel = await amqpConn.createChannel();
    const queueCreator = new QueueCreator(channel);
    new Scheduler(crdClient, queueCreator, channel);
    initHealthcheckApi(LISTEN_PORT);
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
