const uuid = require('node-uuid');
const express = require('express');
const bodyParser = require('body-parser');

const Lib = require('backendCommonsLib');
const { Flow, errors } = Lib;

class HttpApi {
    constructor(app) {
        this._logger = app.getLogger().child({service: 'HttpApi'});
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
                throw new errors.ResourceNotFoundError('Flow is not found');
            }
            const flowModel = new Flow(flow.body);
            const step = flowModel.getFirstNode();
            if (!step) {
                throw new errors.ResourceNotFoundError('Flow has no input step node');
            }
            const scheduleRecord = {
                'taskId': flowModel.id,
                'execId': uuid().replace(/-/g, ''),
                'userId': 'DOES NOT MATTER'
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
            res.json({status: 'OK'});
        } catch (e) {
            this._logger.error(e, req.params, 'hook request failed');
            res.status(500);
            res.end(e.message);
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
module.exports = HttpApi;
