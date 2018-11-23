const _ = require('lodash');
const BaseHandler = require('./base');
const { messages } = require('elasticio-node'); //@todo: replace with OIH???

const REQUEST_FIELDS = [
    'headers',
    'url',
    'method',
    'originalUrl',
    'query',
    'body'
];

// class Message {
//     constructor() {
//         this._headers = {};
//         this._body = {};
//         this._attachments = {};
//     }
//
//     setHeaders(headers) {
//         this._headers = headers;
//     }
//
//     addHeader(name, value) {
//         this._headers[name] = value;
//     }
//
//     setBody(body) {
//         this._body = body;
//     }
//
//     toJSON() {
//         return {
//             headers: this._headers,
//             body: this._body,
//             attachments: this._attachments
//         };
//     }
// }

class PostHandler extends BaseHandler {
    async handle() {
        await this.authorize();
        const msg = await this.createMessageFromPayload();
        const msgOpts = await this.createMessageOptions();
        const result = await this.sendMessageForExecution(msg, msgOpts);
        await this.sendResult(result);
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

    async sendMessageForExecution() {
        //@todo: send to AMQP
        return this.getResult();
    }

    async getResult() {
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

    async sendResult({ status = 200, headers = {}, body = {}}) {
        this._res.status(status).set(headers).send(body);
    }
}

module.exports = PostHandler;
