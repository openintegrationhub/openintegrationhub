const _ = require('lodash');
const BaseHandler = require('./base');
const MessagePublishers = require('../message-publishers');
const assert = require('assert');
const uuid = require('uuid/v1');

const REQUEST_FIELDS = [
    'headers',
    'url',
    'method',
    'originalUrl',
    'query',
    'body'
];

function newEmptyMessage() {

    var msg = {
        id: uuid(),
        attachments: {},
        data: {},
        headers: {},
        metadata: {}
    };

    return msg;
}

/**
 * Configuration object for a client response.
 * @typedef {Object} ClientResponseConfig
 * @param {number} status - http response status code.
 * @param {Object} headers - http response headers.
 * @param {(Object|string|number)} - http response body.
 */

/**
 * Post webhook request handler.
 */
class PostHandler extends BaseHandler {
    /**
     * @param req - express request object
     * @param res - express response object
     * @param {MessagePublisher} messagePublisher
     */
    constructor(req, res, messagePublisher) {
        super(req, res);
        assert(
            messagePublisher instanceof MessagePublishers.Base,
            'messagePublisher has to be an instance of MessagePublisher'
        );
        this._messagePublisher = messagePublisher;
    }

    /**
     * Handle request.
     * @returns {Promise<void>}
     */
    async handle() {
        await this.authorize();
        const msg = await this.createMessageFromPayload();
        const msgOpts = await this.createMessageOptions();
        const result = await this.sendMessageForExecution(msg, msgOpts);
        await this.sendResponse(result);
    }

    /**
     * Authorizes a request.
     * @throws an arrow if not authorized.
     * @returns {Promise<void>}
     */
    async authorize() {
        return;
    }

    /**
     * Parse incoming request and create a Message object based on it.
     * @returns {Message}
     */
    async createMessageFromPayload() {
        const req = this._req;
        const log = this.getLogger();
        log.trace('Creating webhook msg from request');

        const msg = newEmptyMessage();
        msg.metadata.externalExecId = this.getRequestId();

        _.each(REQUEST_FIELDS, (key) => {
            if (key === 'body') {
                msg.data = req[key];
            } else {
                msg[key] = req[key];
            }
        });

        msg.params = {};

        _.each(req.route.keys, (key) => {
            msg.params[key.name] = req.param(key.name);
        });

        //extracting pathSuffix from url that may contain get parameters
        msg.pathSuffix = req.path.replace(new RegExp(`/hook/${req.params.taskId}`, 'g'), '');

        if (typeof msg.data === 'string' || Buffer.isBuffer(msg.data)) {
            // data should be JSON object and not string and not buffer
            msg.data = {};
        }

        if (req.method === 'GET') {
            msg.data = req.query;
        }

        log.debug({ msg: msg }, 'Message to be pushed to the webhook queue');

        return msg;
    }

    /**
     * Create message options object.
     * @returns {Promise<Object>}
     */
    async createMessageOptions() {
        const headers = {
            taskId: this.getFlow().id,
            execId: uuid().replace(/-/g, ''),
            userId: 'DOES_NOT_MATTER'
        };
        return { headers };
    }

    /**
     * Send a webhook message for execution.
     * @param {Message} msg
     * @param {Object} msgOpts
     * @returns {Promise<ClientResponseConfig>}
     */
    async sendMessageForExecution(msg, msgOpts) {
        const flow = this.getFlow();
        await this._messagePublisher.publish(flow, msg, msgOpts);
        return this.getResponse();
    }

    /**
     * Return client response configuration object.
     * @returns {Promise<ClientResponseConfig>}
     */
    async getResponse() {
        return {
            status: 200,
            headers: {
                'content-type': 'application/json'
            },
            body: {
              data:{
                requestId: this.getRequestId(),
                message: 'thank you'
                }
            }
        };
    }

    /**
     * Respond to client.
     * @param {ClientResponseConfig}
     * @returns {Promise<void>}
     */
    async sendResponse({ status = 200, headers = {}, body = {} }) {
        this._res.status(status).set(headers).send(body);
    }
}

module.exports = PostHandler;
