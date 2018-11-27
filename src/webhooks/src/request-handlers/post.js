const _ = require('lodash');
const BaseHandler = require('./base');
const { messages } = require('elasticio-node'); //@todo: replace with OIH???
const MessagePublishers = require('../message-publishers');
const assert = require('assert');

const REQUEST_FIELDS = [
    'headers',
    'url',
    'method',
    'originalUrl',
    'query',
    'body'
];

class PostHandler extends BaseHandler {
    constructor(req, res, messagePublisher) {
        super(req, res);
        assert(
            messagePublisher instanceof MessagePublishers.Base,
            'messagePublisher has to be an instance of MessagePublisher'
        );
        this._messagePublisher = messagePublisher;
    }

    async handle() {
        await this.authorize();
        const msg = await this.createMessageFromPayload();
        const msgOpts = await this.createMessageOptions();
        const result = await this.sendMessageForExecution(msg, msgOpts);
        await this.sendResponse(result);
    }

    async authorize() {
        return true;
    }

    async createMessageFromPayload() {
        const req = this._req;
        const flow = this.getFlow();
        const log = this.getLogger();
        log.trace('Creating webhook msg from request');

        const msg = messages.newEmptyMessage();

        _.each(REQUEST_FIELDS, (key) => {
            msg[key] = req[key];
        });

        msg.params = {};

        _.each(req.route.keys, (key) => {
            msg.params[key.name] = req.param(key.name);
        });

        //extracting pathSuffix from url that may contain get parameters
        msg.pathSuffix = req.path.replace(new RegExp(`/hook/${req.params.taskId}`, 'g'), '');

        if (typeof msg.body === 'string' || Buffer.isBuffer(msg.body)) {
            // Body should be JSON object and not string and not buffer
            msg.body = {};
        }

        if (req.method === 'GET') {
            msg.body = req.query;
        }

        msg.taskId = flow.id; //@todo: don't forget
        log.debug({ msg: msg }, 'Message to be pushed to the webhook queue');

        return msg;
    }

    async createMessageOptions() {
        const headers = { taskId: this.getFlow().id };
        return { headers };
    }

    async sendMessageForExecution(msg, msgOpts) {
        const flow = this.getFlow();
        await this._messagePublisher.publish(flow, msg, msgOpts);
        return this.getResponse();
    }

    async getResponse() {
        return {
            status: 200,
            headers: {
                'content-type': 'application/json'
            },
            body: {
                requestId: this.getRequestId(),
                message: 'thank you'
            }
        }
    }

    async sendResponse({ status = 200, headers = {}, body = {}}) {
        this._res.status(status).set(headers).send(body);
    }
}

module.exports = PostHandler;
