'use strict';
const _ = require('lodash');
const crypto = require('crypto');
const basicAuth = require('basic-auth');

const queues = require('./queues');
const logger = require('./logger.js');
const messages = require('elasticio-node').messages;
const { env, amqp, mongo } = require('@elastic.io/commons');
const processAttachment = require('./attachments').processAttachment;
const cleanupTempFiles = require('./attachments').cleanup;

const { Account, RunningTask } = mongo;

const REPLY_QUEUE = env.getEnvironmentalName('webhooks.reply.');
const REQUEST_REPLY_SERVICE_NAME = 'request-reply';
const REPLY_TO_HEADER = 'reply_to';


const EIO_SIGNATURE_HEADER = 'x-eio-signature';
const NO_SIG_HEADER_ERROR_MESSAGE = [
    'The request is expected to be signed.',
    `Please send the signature using the ${EIO_SIGNATURE_HEADER} HTTP header`
].join(' ');

const INCORRECT_SIG_HEADER_VALUE_ERROR_MESSAGE = [
    'The provided request signature does not match.',
    'Please check your signature key'
].join(' ');

const INVALID_BASIC_AUTH_HEADER_ERROR_MESSAGE = 'Unable to parse Authorization header';
const BASIC_AUTH_INVALID_ERROR_MESSAGE = 'Username or password mismatch';

const API_KEY_AUTH_HEADER_INVALID_ERROR_MESSAGE = 'API key header not found';
const API_KEY_AUTH_INVALID_ERROR_MESSAGE = 'Invalid API key provided';

// Delay in msec with error response
// to prevent try-and-error way to find
// suitable webhook IDs
const ANTIHACK_RESPONSE_DELAY = 3000;

const REQUEST_FIELDS = [
    'headers',
    'url',
    'method',
    'originalUrl',
    'query',
    'body'
];

const AUTH_TYPE = {
    NO_AUTH: 'NO_AUTH',
    BASIC: 'BASIC',
    API_KEY: 'API_KEY',
    HMAC: 'HMAC'
};


function getRequestData(req) {
    const result = messages.newEmptyMessage();

    _.each(REQUEST_FIELDS, (key) => {
        result[key] = req[key];
    });

    result.params = {};

    _.each(req.route.keys, (key) => {
        result.params[key.name] = req.param(key.name);
    });

    //extracting pathSuffix from url that may contain get parameters
    result.pathSuffix = req.path.replace(new RegExp(`/hook/${req.params.taskId}`, 'g'), '');

    if (typeof result.body === 'string' || Buffer.isBuffer(result.body)) {
        // Body should be JSON object and not string and not buffer
        result.body = {};
    }

    return result;
}

function getHmacSignature(data, key) {
    return crypto.createHmac('sha512', key).update(data).digest('hex');
}

function extractGetParams(req, msg) {
    if (req.method === 'GET') {
        msg.body = req.query;
    }
}

async function createMessageFromPayload(taskId, req, log) {
    log.trace('Creating webhook msg from request');

    const msg = getRequestData(req);

    extractGetParams(req, msg);

    msg.taskId = taskId;
    log.debug({
        msg: msg
    }, 'Message to be pushed to the webhook queue');

    if (req.files) {
        log.debug(req.files, 'Processing attachments');
        for (const fieldName in req.files) {
            const file = req.files[fieldName];
            msg.attachments[file.originalFilename || fieldName] = await processAttachment(file, log);
        }
        log.debug('Attachment processing completed, processed attachments count=%', Object.keys(req.files).length);
    }
    return msg;
}

function isRequestReplyTask(task) {

    const requestReplyStep = task.recipe.nodes.find(it => it.service === REQUEST_REPLY_SERVICE_NAME);

    if (!requestReplyStep) {
        return false;
    }

    return true;
}

class WebHook {
    constructor(readChannel, writeChannel, opts) {
        this.readChannel = readChannel;
        this.writeChannel = writeChannel;
        this.ANTIHACK_RESPONSE_DELAY = (opts || {}).antihack_delay || ANTIHACK_RESPONSE_DELAY;
    }

    async verify(req, res) {
        const task = req.task;
        const taskId = req.params.taskId;
        const log = logger.createDefaultLogger(taskId);
        log.info('webhook_verify_request');
        if (!task) {
            log.warn(`Web hook verification failed. Task ${taskId} does not exist`);

            await new Promise(res => setTimeout(res, this.ANTIHACK_RESPONSE_DELAY));
            log.info({
                status: 404
            }, 'webhook_verify_status');

            res.status(404).json({
                message: `Task ${taskId} either does not exist or is inactive`
            });
        }

        log.info({
            status: 200
        }, 'webhook_verify_status');

        res.writeHead(200);
        res.end();
    }

    async handle(req, res) {
        let stop = false;
        req.on('close', () => stop = true);
        res.on('end', () => stop = true);
        const started = Date.now();
        const requestId = req.id;
        const id = req.params.taskId;
        const task = req.task;
        const defaultLogger = logger.createDefaultLogger(id);

        try {
            defaultLogger.debug({
                req
            }, 'Incoming request');

            defaultLogger.info('webhook_handle_request');

            //if content-type is omitted in POST throw 415
            if (req.method === 'POST' && !req.headers['content-type']) {
                const error = new Error('Content-Type header is missing');
                error.statusCode = 415;
                throw error;
            }

            defaultLogger.trace(`Handling web hook request for requestId=${requestId}`);
            if (!task) {
                await new Promise(res => setTimeout(res, this.ANTIHACK_RESPONSE_DELAY));
                const reason = new Error(`Task ${id} either does not exist or is inactive.`);
                reason.statusCode = 404;
                defaultLogger.error(reason, `Sending 404 response for requestId=${requestId}`);
                throw reason;
            }

            const taskHeaders = task.toSchedulerRecord();
            const traceId = taskHeaders['x-eio-meta-trace-id'];
            const isRequestReply = isRequestReplyTask(task);

            const firstStep = task.getFirstNode();
            if (!firstStep) {
                throw new Error('Could not find first step');
            }
            const firstStepId = firstStep.id;
            const hmacKey = _.get(task, `data.${firstStepId}.hmac_key`);
            const credentialsId = _.get(task, `data.${firstStepId}._account`);

            const log = logger.createTaskLogger(taskHeaders).child({
                use_hmac: !!hmacKey,
                credentialsId,
                request_reply: isRequestReply,
                requestId,
                traceId
            });

            log.info('webhook_handle_info');

            let auth;

            if (credentialsId) {
                const credentials = await Account.findById(credentialsId);
                if (!credentials) {
                    throw new Error(`Credentials with id ${credentialsId} not found`);
                }
                auth = _.get(credentials, 'keys.auth');
            } else if (hmacKey) {
                auth = {
                    type: AUTH_TYPE.HMAC,
                    hmacSecret: hmacKey
                };
            }

            if (auth) {
                try {
                    await this.authorize(req, auth, defaultLogger);
                } catch (err) {
                    const { statusCode } = err;
                    const message = statusCode
                        ? `Sending ${err.statusCode} response for traceId=${traceId}`
                        : 'Unexpected auth error';
                    log.error(err, message);
                    await new Promise(resolve => setTimeout(resolve, this.ANTIHACK_RESPONSE_DELAY));
                    throw err;
                }
            }

            const runningTask = await RunningTask.ensureRecord(task);

            if (isRequestReply) {
                log.trace('I am a request-reply task');
                const replyTo = queues.getReplyRoutingKey(traceId);
                taskHeaders[REPLY_TO_HEADER] = replyTo;

                if (process.env.MAINTENANCE_MODE) {
                    const err = new Error('Sorry, request-response feature is currently unavailable');
                    err.statusCode = 500;
                    defaultLogger.error(err, `Sending 500 response for execId=${runningTask.execId}`);
                    throw err;
                }
            }

            const msg = await createMessageFromPayload(id, req, log);

            if (isRequestReply) {
                if (stop) {
                    return;
                }
                let steps = queues.prepareReplyQueue(this.readChannel, task, traceId);
                await steps.assertExchange();

                if (stop) {
                    return;
                }
                await steps.assertQueue();
                if (stop) {
                    return await steps.deleteQueue();
                }
                await steps.bindQueue();
                if (stop) {
                    return await steps.deleteQueue();
                }

            }
            taskHeaders.execId = runningTask.execId;
            const queueName = amqp.getMessagesQueue(task, task.getFirstNode().id);
            await amqp.sendToQueueEncrypted(this.writeChannel, queueName, msg, {
                headers: taskHeaders 
            });

            if (!isRequestReply) {
                log.info({
                    duration: Date.now() - started
                }, 'responding immediately');
                const headers = {
                    'Content-Type': 'application/json'
                };
                const body = {
                    requestId,
                    message: 'thank you'
                };
                return res.set(headers).send(body);
            }
            
            if (stop) {
                return;
            }
            log.trace('Going to wait for execution results to send response');
            const reader = queues.consumeFromReplyQueue(this.readChannel, traceId);
            req.on('close', () => {
                reader.cancel();
                log.info({
                    duration: Date.now() - started
                }, 'canceled reply-queue consumer due to request close');
            });
            const result = await reader.promise;
            if (stop) {
                return;
            }
            log.info({
                duration: Date.now() - started
            }, 'got result from reply-queue, responding');
            res.set(result.headers).send(result.body);
            //NOTE this log message is used for http://grafana.eio.cloud:3000/dashboard/db/webhooks
            defaultLogger.info({
                status: 200,
                duration: Date.now() - started
            }, 'webhook_handle_status');
            cleanupTempFiles(req, defaultLogger);

        } catch (err) {
            //NOTE this log message is used for http://grafana.eio.cloud:3000/dashboard/db/webhooks
            defaultLogger.info({
                status: err.statusCode || 500,
                duration: Date.now() - started
            }, 'webhook_handle_status');
            cleanupTempFiles(req, defaultLogger);
            defaultLogger.error(err, 'general webhook error handler');
            const statusCode = err.statusCode || 500;
            res.status(statusCode).json({
                error: err.message
            });
        }
    }

    async authorize(req, auth, log) {
        const { type: authType } = auth;
        if (authType === AUTH_TYPE.HMAC) {
            let hmacKey = auth.hmacSecret;
            log.trace('verifying HMAC signature for request');
            const signature = getHmacSignature(req.rawBody || Buffer.from([]), hmacKey);
            const headerSig = req.headers[EIO_SIGNATURE_HEADER];

            if (!headerSig) {
                const err = new Error(NO_SIG_HEADER_ERROR_MESSAGE);
                err.statusCode = 400;
                log.error(err, 'Sending 400 response because missing sig header');
                throw err;
            }

            if (signature !== headerSig) {
                log.info('signature does not match');
                const reason = new Error(INCORRECT_SIG_HEADER_VALUE_ERROR_MESSAGE);
                reason.statusCode = 400;
                throw reason;
            }

            log.info('signature OK');
        } else if (authType === AUTH_TYPE.BASIC) {
            const { basic } = auth;
            const user = basicAuth(req);
            if (!user) {
                log.info('unable to parse basic auth');
                const reason = new Error(INVALID_BASIC_AUTH_HEADER_ERROR_MESSAGE);
                reason.statusCode = 401;
                throw reason;
            }
            if (user.name !== basic.username || user.pass !== basic.password) {
                log.info('basic auth username/password mismatch');
                const reason = new Error(BASIC_AUTH_INVALID_ERROR_MESSAGE);
                reason.statusCode = 401;
                throw reason;
            }

            log.info('Basic auth OK');
        } else if (authType === AUTH_TYPE.API_KEY) {
            const { apiKey } = auth;
            const key = req.headers[apiKey.headerName.toLowerCase()];
            if (!key) {
                log.info('API key header not found');
                const reason = new Error(API_KEY_AUTH_HEADER_INVALID_ERROR_MESSAGE);
                reason.statusCode = 401;
                throw reason;
            }

            if (key !== apiKey.headerValue) {
                log.info('API key mismatch');
                const reason = new Error(API_KEY_AUTH_INVALID_ERROR_MESSAGE);
                reason.statusCode = 401;
                throw reason;
            }

            log.info('API key OK');
        }
    }
}


exports.WebHook = WebHook;
exports.REPLY_QUEUE = REPLY_QUEUE;
