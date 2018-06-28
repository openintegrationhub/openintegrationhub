const K8sApi = require('kubernetes-client');
const {Client, config} = K8sApi;
const uuid = require('node-uuid');
const amqp = require('amqplib');
const bunyan = require('bunyan');
const express = require('express');
const bodyParser = require('body-parser');

const QueueCreator = require('./QueueCreator.js');

const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqp://guest:guest@127.0.0.1:5672/';
const LISTEN_PORT = process.env.LISTEN_PORT || 1236;
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
    constructor(crdClient, queueCreator, channel) {
        this._logger = bunyan({name: "HttpApi", level: LOG_LEVEL});
        this._crdClient = crdClient;
        this._queueCreator = queueCreator;
        this._channel = channel;
        this._app = express();
        this._app.use(bodyParser.json({
            limit: 1024 * 1024
        }));
        this._app.use(bodyParser.urlencoded({
            limit: 1024 * 1024,
            extended: true
        }));

        this._app.get('/flow/:flowId', this._handleHook.bind(this));
        this._app.post('/flow/:flowId', this._handleHook.bind(this));
        this._app.get('/healthcheck', this._healthcheck.bind(this));
    }
    listen(listenPort) {
        this._logger.info({port: listenPort}, 'Going to listen for http');
        this._app.listen(listenPort);
    }
    async _handleHook(req, res) {
        this._logger.trace(req.params, 'hook message');
        try {
            const flow = await this._crdClient.flows(req.params.flowId).get();
            if (!flow) {
                throw new Error('404');
            }
            const flowModel = new Flow(flow.body);
            const step = flowModel.getFirstNode();
            if (!step) {
                throw new Error('404');
            }
            const scheduleRecord = {
                'taskId': flowModel.id,
                'execId': uuid().replace(/-/g, ''),
                'userId': "DOES NOT MATTER"
            };
            const msg = this._getRequestData(flowModel.id, req);
            const queue = this._queueCreator.getAmqpStepConfig(flowModel, step.id).messagesQueue;
            this._logger.trace({queue, body: msg, scheduleRecord}, 'send message to queue');
            await this._channel.sendToQueue(
                queue,
                Buffer.from(JSON.stringify(msg)),
                {
                    headers:  scheduleRecord
                }
            );

            res.status(200);
            res.set('Content-Type', 'application/json');
            res.end(JSON.stringify({status: 'OK'}));
        } catch (e) {
            this._logger.error(e, req.params, 'hook request');
            res.status(500);
            res.end();
            return;
        }
    }
    _getRequestData(flowId, req) {
        const REQUEST_FIELDS = [
            'headers',
            'url',
            'method',
            'originalUrl',
            'query',
            'body'
        ];
        const msg = {
            id: uuid.v1(),
            attachments: {},
            body: {},
            headers: {},
            metadata: {},
            params: {}
        };

        for (let key of REQUEST_FIELDS) {
            msg[key] = req[key];
        }
        if (typeof msg.body === 'string' || Buffer.isBuffer(msg.body)) {
            // Body should be JSON object and not string and not buffer
            msg.body = {};
        }
        if (req.method === 'GET') {
            msg.body = req.query;
        }

        msg.taskId = flowId;
        return msg;
    }
    
    async _healthcheck(req, res) {
        this._logger.trace('Healthcheck request');
        res.status(200).end(); 
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
    const amqpConn = await waitConnectAmqp(RABBITMQ_URI, logger);
    const channel = await amqpConn.createChannel();
    const queueCreator = new QueueCreator(channel);
    const httpApi = new HttpApi(crdClient, queueCreator, channel);
    httpApi.listen(LISTEN_PORT);
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
