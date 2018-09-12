const uuid = require('node-uuid');
const express = require('express');
const bodyParser = require('body-parser');

const Lib = require('lib');
const { 
    QueueCreator,
    Flow,
    App,
    K8sService,
    AMQPService
} = Lib;

class HttpApi {
    constructor(app) {
        this._logger = app.getLogger().child({service: "HttpApi"});
        this._crdClient = app.getK8s().getCRDClient();
        this._queueCreator = app.getQueueCreator();
        this._channel = app.getAmqpChannel();
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

class CommunicationRouterApp extends App {
    async _run () {
        this._amqp = new AMQPService(this);
        this._k8s = new K8sService(this);
        await this._amqp.start();
        await this._k8s.start();
        this._channel = await this._amqp.getConnection().createChannel();
        this._queueCreator = new QueueCreator(this._channel);
        this._httpApi = new HttpApi(this);
        this._httpApi.listen(this.getConfig().get('LISTEN_PORT'));
    }

    getK8s() {
        return this._k8s;
    }

    getQueueCreator() {
        return this._queueCreator;
    }

    getAmqpChannel() {
        return this._channel;
    }

    static get NAME() {
        return 'communication-router';
    }

}

(async () => {
    try {
        const app = new CommunicationRouterApp();
        await app.start();
    } catch (e) {
        console.error('Critical error, going to die', e, e && e.stack); //eslint-disable-line
        process.exit(1);
    }
})();
