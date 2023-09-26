/* eslint no-underscore-dangle: 0 */ // --> OFF
/* eslint max-len: 0 */ // --> OFF
/* eslint class-methods-use-this: 0 */ // --> OFF

/* eslint no-shadow: 0 */ // --> OFF

const co = require('co');
const amqplib = require('amqplib');
const { EventEmitter } = require('events');

const PREFIX = 'sailor_nodejs_integration_test';
const nock = require('nock');
const express = require('express');
const jwt = require('jsonwebtoken');
const ShellTester = require('./ShellTester');
const encryptor = require('../../lib/encryptor');

const FAKE_API_PORT = 1244; // most likely the port won't be taken – https://www.adminsub.net/tcp-udp-port-finder/1244

const { env } = process;

// @todo move AmqpHelper to dedicated file (will be done in the future refactoring)
class AmqpHelper extends EventEmitter {
    constructor() {
        super();

        this.httpReplyQueueName = `${PREFIX}request_reply_queue`;
        this.httpReplyQueueRoutingKey = `${PREFIX}request_reply_routing_key`;
        this.nextStepQueue = `${PREFIX}_next_step_queue`;
        this.nextStepErrorQueue = `${PREFIX}_next_step_queue_errors`;

        this.dataMessages = [];
        this.errorMessages = [];

        this._amqp = null;

        this.counterData = 0;
    }

    prepareEnv() {
        env.ELASTICIO_LISTEN_MESSAGES_ON = `${PREFIX}:messages`;
        env.ELASTICIO_PUBLISH_MESSAGES_TO = `${PREFIX}:exchange`;

        env.ELASTICIO_BACKCHANNEL_EXCHANGE = `${PREFIX}:BACKCHANNEL_EXCHANGE`;

        env.ELASTICIO_OUTPUT_ROUTING_KEY = `${PREFIX}:routing_key:message`;

        env.ELASTICIO_GOVERNANCE_ROUTING_KEY = `${PREFIX}:routing_key:governance`;

        env.ELASTICIO_ERROR_ROUTING_KEY = `${PREFIX}:routing_key:error`;
        env.ELASTICIO_REBOUND_ROUTING_KEY = `${PREFIX}:routing_key:rebound`;
        env.ELASTICIO_SNAPSHOT_ROUTING_KEY = `${PREFIX}:routing_key:snapshot`;
        env.ELASTICIO_AMQP_PUBLISH_RETRY_ATTEMPTS = 3;
        env.ELASTICIO_AMQP_PUBLISH_MAX_RETRY_DELAY = 60 * 1000;
        env.ELASTICIO_SNAPSHOTS_SERVICE_BASE_URL = 'https://localhost:2345';
    }

    publishMessage(message, { parentMessageId, threadId } = {}, headers = {}) {
        const msgHeaders = Object.assign({
            execId: env.ELASTICIO_EXEC_ID,
            taskId: env.ELASTICIO_FLOW_ID,
            workspaceId: env.ELASTICIO_WORKSPACE_ID,
            userId: env.ELASTICIO_USER_ID,
            threadId,
            stepId: message.headers.stepId,
            messageId: parentMessageId
        }, headers);

        const protocolVersion = Number(msgHeaders.protocolVersion || 1);

        const routingKey = env.ELASTICIO_OUTPUT_ROUTING_KEY;

        // if ('x-eio-routing-key' in message.headers) {
        //     routingKey = message.headers['x-eio-routing-key'];
        //     // msgHeaders['x-eio-routing-key'] = message.properties.headers['x-eio-routing-key'];
        // }

        return this.subscriptionChannel.publish(
            env.ELASTICIO_LISTEN_MESSAGES_ON,
            routingKey,
            encryptor.encryptMessageContent(
                message,
                protocolVersion < 2 ? 'base64' : undefined
            ),
            {
                headers: msgHeaders,
                persistent: true
            }
        );
    }

    * prepareQueues() {
        const amqp = yield amqplib.connect(env.ELASTICIO_AMQP_URI);
        this._amqp = amqp;
        const subscriptionChannel = yield amqp.createChannel();

        const backChannel = yield amqp.createChannel();

        const publishChannel = yield amqp.createChannel();

        yield subscriptionChannel.assertQueue(env.ELASTICIO_LISTEN_MESSAGES_ON);

        // yield backChannel.assertQueue(env.ELASTICIO_BACKCHANNEL_EXCHANGE);

        yield publishChannel.assertQueue(this.nextStepQueue);
        yield publishChannel.assertQueue(this.nextStepErrorQueue);

        const exchangeOptions = {
            durable: true,
            autoDelete: false
        };

        yield subscriptionChannel.assertExchange(env.ELASTICIO_LISTEN_MESSAGES_ON, 'direct', exchangeOptions);
        yield publishChannel.assertExchange(env.ELASTICIO_PUBLISH_MESSAGES_TO, 'direct', exchangeOptions);

        // yield backChannel.assertExchange(env.ELASTICIO_BACKCHANNEL_EXCHANGE, 'direct', exchangeOptions);

        yield subscriptionChannel.bindQueue(
            env.ELASTICIO_LISTEN_MESSAGES_ON,
            env.ELASTICIO_LISTEN_MESSAGES_ON,
            env.ELASTICIO_OUTPUT_ROUTING_KEY
        );

        // yield backChannel.bindQueue(
        //     env.ELASTICIO_BACKCHANNEL_EXCHANGE,
        //     env.ELASTICIO_BACKCHANNEL_EXCHANGE,
        //     '*');

        yield publishChannel.bindQueue(
            this.nextStepQueue,
            env.ELASTICIO_PUBLISH_MESSAGES_TO,
            env.ELASTICIO_OUTPUT_ROUTING_KEY
        );

        yield publishChannel.bindQueue(
            this.nextStepErrorQueue,
            env.ELASTICIO_PUBLISH_MESSAGES_TO,
            env.ELASTICIO_ERROR_ROUTING_KEY
        );

        yield publishChannel.assertQueue(this.httpReplyQueueName);
        yield publishChannel.bindQueue(
            this.httpReplyQueueName,
            env.ELASTICIO_PUBLISH_MESSAGES_TO,
            this.httpReplyQueueRoutingKey
        );

        yield publishChannel.purgeQueue(this.nextStepQueue);
        yield publishChannel.purgeQueue(this.nextStepErrorQueue);
        yield publishChannel.purgeQueue(this.httpReplyQueueName);
        yield publishChannel.purgeQueue(env.ELASTICIO_LISTEN_MESSAGES_ON);

        // yield backChannel.purgeQueue(env.ELASTICIO_BACKCHANNEL_EXCHANGE);

        this.subscriptionChannel = subscriptionChannel;

        this.backChannel = backChannel;

        this.publishChannel = publishChannel;
    }

    cleanUp() {
        return co(function* gen() {
            this.removeAllListeners();
            this.dataMessages = [];
            yield Promise.all([
                this.publishChannel.cancel('sailor_nodejs_1'),
                this.publishChannel.cancel('sailor_nodejs_2'),
                this.publishChannel.cancel('sailor_nodejs_3')
            ]);
            yield this._amqp.close();
        }.bind(this));
    }

    prepare() {
        const that = this;
        return co(function* gen() {
            that.prepareEnv();
            yield that.prepareQueues();

            yield that.publishChannel.consume(
                that.nextStepQueue,
                that.consumer.bind(that, that.nextStepQueue),
                { consumerTag: 'sailor_nodejs_1' }
            );

            yield that.publishChannel.consume(
                that.nextStepErrorQueue,
                that.consumer.bind(that, that.nextStepErrorQueue),
                { consumerTag: 'sailor_nodejs_2' }
            );

            yield that.publishChannel.consume(
                that.httpReplyQueueName,
                that.consumer.bind(that, that.httpReplyQueueName),
                { consumerTag: 'sailor_nodejs_3' }
            );
        });
    }

    consumer(queue, message) {
        this.dataMessages.push(message);
        this.emit('data', message, queue);
    }

    retrieveAllMessagesNotConsumedBySailor(timeout = 1000) {
        return co(function* gen() {
            const consumerTag = 'tmp_consumer';
            const data = [];

            yield this.subscriptionChannel.consume(
                env.ELASTICIO_LISTEN_MESSAGES_ON,
                (message) => {
                    this.subscriptionChannel.ack(message);
                    const protocolVersion = Number(message.properties.headers.protocolVersion || 1);

                    const emittedMessage = encryptor.decryptMessageContent(
                        message.content,
                        protocolVersion < 2 ? 'base64' : undefined
                    );

                    const entry = {
                        properties: message.properties,
                        body: emittedMessage.body,
                        emittedMessage
                    };
                    data.push(entry);
                },
                { consumerTag }
            );
            yield new Promise(resolve => setTimeout(resolve, timeout));

            yield this.subscriptionChannel.cancel(consumerTag);

            return data;
        }.bind(this));
    }
}

class AmqpHelperGlobal extends EventEmitter {
    constructor() {
        super();

        this.httpReplyQueueName = `${PREFIX}request_reply_queue`;
        this.httpReplyQueueRoutingKey = `${PREFIX}request_reply_routing_key`;
        this.nextStepQueue = `${PREFIX}_next_step_queue`;
        this.nextStepErrorQueue = `${PREFIX}_next_step_queue_errors`;

        this.dataMessages = [];
        this.errorMessages = [];

        this._amqp = null;

        this.counterData = 0;
    }

    prepareEnv() {
        env.ELASTICIO_LISTEN_MESSAGES_ON = `${PREFIX}:messages`;
        env.ELASTICIO_PUBLISH_MESSAGES_TO = `${PREFIX}:exchange`;

        env.ELASTICIO_BACKCHANNEL_EXCHANGE = `${PREFIX}:BACKCHANNEL_EXCHANGE`;

        env.ELASTICIO_OUTPUT_ROUTING_KEY = `${PREFIX}:routing_key:output`;
        env.ELASTICIO_GOVERNANCE_ROUTING_KEY = `${PREFIX}:routing_key:governance`;

        env.ELASTICIO_ERROR_ROUTING_KEY = `${PREFIX}:routing_key:error`;
        env.ELASTICIO_REBOUND_ROUTING_KEY = `${PREFIX}:routing_key:rebound`;
        env.ELASTICIO_SNAPSHOT_ROUTING_KEY = `${PREFIX}:routing_key:snapshot`;
        env.ELASTICIO_AMQP_PUBLISH_RETRY_ATTEMPTS = 3;
        env.ELASTICIO_AMQP_PUBLISH_MAX_RETRY_DELAY = 60 * 1000;
    }

    publishMessage(message, { parentMessageId, threadId } = {}, headers = {}) {
        const orchestratorToken = jwt.sign({
            flowId: '5559edd38968ec0736000003',
            stepId: 'step_1',
            userId: '5559edd38968ec0736000002',
            function: 'init_trigger',
            apiKey: '123456',
            apiUsername: 'someuser@openintegrationhub.com'
        }, 'somesecret');

        const msgHeaders = Object.assign({
            execId: env.ELASTICIO_EXEC_ID,
            taskId: env.ELASTICIO_FLOW_ID,
            workspaceId: env.ELASTICIO_WORKSPACE_ID,
            userId: env.ELASTICIO_USER_ID,
            threadId,
            stepId: message.headers.stepId,
            messageId: parentMessageId,
            orchestratorToken
        }, headers);

        const protocolVersion = Number(msgHeaders.protocolVersion || 1);

        const routingKey = env.ELASTICIO_OUTPUT_ROUTING_KEY;

        // if ('x-eio-routing-key' in message.headers) {
        //     routingKey = message.headers['x-eio-routing-key'];
        //     // msgHeaders['x-eio-routing-key'] = message.properties.headers['x-eio-routing-key'];
        // }

        return this.subscriptionChannel.publish(
            env.ELASTICIO_LISTEN_MESSAGES_ON,
            routingKey,
            encryptor.encryptMessageContent(
                message,
                protocolVersion < 2 ? 'base64' : undefined
            ),
            {
                headers: msgHeaders,
                persistent: true
            }
        );
    }

    * prepareQueues() {
        const amqp = yield amqplib.connect(env.ELASTICIO_AMQP_URI);
        this._amqp = amqp;
        const subscriptionChannel = yield amqp.createChannel();

        const backChannel = yield amqp.createChannel();

        const publishChannel = yield amqp.createChannel();

        yield subscriptionChannel.assertQueue(env.ELASTICIO_LISTEN_MESSAGES_ON);

        // yield backChannel.assertQueue(env.ELASTICIO_BACKCHANNEL_EXCHANGE);

        yield publishChannel.assertQueue(this.nextStepQueue);
        yield publishChannel.assertQueue(this.nextStepErrorQueue);

        const exchangeOptions = {
            durable: true,
            autoDelete: false
        };

        yield subscriptionChannel.assertExchange(env.ELASTICIO_LISTEN_MESSAGES_ON, 'direct', exchangeOptions);
        yield publishChannel.assertExchange(env.ELASTICIO_BACKCHANNEL_EXCHANGE, 'direct', exchangeOptions);

        // yield backChannel.assertExchange(env.ELASTICIO_BACKCHANNEL_EXCHANGE, 'direct', exchangeOptions);

        yield subscriptionChannel.bindQueue(
            env.ELASTICIO_LISTEN_MESSAGES_ON,
            env.ELASTICIO_LISTEN_MESSAGES_ON,
            env.ELASTICIO_OUTPUT_ROUTING_KEY
        );

        // yield backChannel.bindQueue(
        //     env.ELASTICIO_BACKCHANNEL_EXCHANGE,
        //     env.ELASTICIO_BACKCHANNEL_EXCHANGE,
        //     '*');

        yield publishChannel.bindQueue(
            this.nextStepQueue,
            env.ELASTICIO_BACKCHANNEL_EXCHANGE,
            env.ELASTICIO_OUTPUT_ROUTING_KEY
        );

        yield publishChannel.bindQueue(
            this.nextStepErrorQueue,
            env.ELASTICIO_BACKCHANNEL_EXCHANGE,
            env.ELASTICIO_ERROR_ROUTING_KEY
        );

        yield publishChannel.assertQueue(this.httpReplyQueueName);
        yield publishChannel.bindQueue(
            this.httpReplyQueueName,
            env.ELASTICIO_BACKCHANNEL_EXCHANGE,
            this.httpReplyQueueRoutingKey
        );

        yield publishChannel.purgeQueue(this.nextStepQueue);
        yield publishChannel.purgeQueue(this.nextStepErrorQueue);
        yield publishChannel.purgeQueue(this.httpReplyQueueName);
        yield publishChannel.purgeQueue(env.ELASTICIO_LISTEN_MESSAGES_ON);

        // yield backChannel.purgeQueue(env.ELASTICIO_BACKCHANNEL_EXCHANGE);

        this.subscriptionChannel = subscriptionChannel;

        this.backChannel = backChannel;

        this.publishChannel = publishChannel;
    }

    cleanUp() {
        return co(function* gen() {
            this.removeAllListeners();
            this.dataMessages = [];
            yield Promise.all([
                this.publishChannel.cancel('sailor_nodejs_1'),
                this.publishChannel.cancel('sailor_nodejs_2'),
                this.publishChannel.cancel('sailor_nodejs_3')
            ]);
            yield this._amqp.close();
        }.bind(this));
    }

    prepare() {
        const that = this;
        return co(function* gen() {
            that.prepareEnv();
            yield that.prepareQueues();

            yield that.publishChannel.consume(
                that.nextStepQueue,
                that.consumer.bind(that, that.nextStepQueue),
                { consumerTag: 'sailor_nodejs_1' }
            );

            yield that.publishChannel.consume(
                that.nextStepErrorQueue,
                that.consumer.bind(that, that.nextStepErrorQueue),
                { consumerTag: 'sailor_nodejs_2' }
            );

            yield that.publishChannel.consume(
                that.httpReplyQueueName,
                that.consumer.bind(that, that.httpReplyQueueName),
                { consumerTag: 'sailor_nodejs_3' }
            );
        });
    }

    consumer(queue, message) {
        this.dataMessages.push(message);
        this.emit('data', message, queue);
    }

    retrieveAllMessagesNotConsumedBySailor(timeout = 1000) {
        return co(function* gen() {
            const consumerTag = 'tmp_consumer';
            const data = [];

            yield this.subscriptionChannel.consume(
                env.ELASTICIO_LISTEN_MESSAGES_ON,
                (message) => {
                    this.subscriptionChannel.ack(message);
                    const protocolVersion = Number(message.properties.headers.protocolVersion || 1);

                    const emittedMessage = encryptor.decryptMessageContent(
                        message.content,
                        protocolVersion < 2 ? 'base64' : undefined
                    );

                    const entry = {
                        properties: message.properties,
                        body: emittedMessage.body,
                        emittedMessage
                    };
                    data.push(entry);
                },
                { consumerTag }
            );
            yield new Promise(resolve => setTimeout(resolve, timeout));

            yield this.subscriptionChannel.cancel(consumerTag);

            return data;
        }.bind(this));
    }
}

// function amqp() {
//   const handle = {
//     // eslint-disable-next-line no-empty-function
//     getMessages() {
//     },
//   };
//   return handle;
// }

function prepareEnv() {
    env.ELASTICIO_AMQP_URI = 'amqp://guest:guest@localhost:5672';
    env.ELASTICIO_RABBITMQ_PREFETCH_SAILOR = '1';
    env.ELASTICIO_FLOW_ID = '5559edd38968ec0736000003';
    env.ELASTICIO_STEP_ID = 'step_1';
    env.ELASTICIO_EXEC_ID = 'some-exec-id';

    env.ELASTICIO_WORKSPACE_ID = '5559edd38968ec073600683';
    env.ELASTICIO_CONTAINER_ID = 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948';

    env.ELASTICIO_USER_ID = '5559edd38968ec0736000002';
    env.ELASTICIO_COMP_ID = '5559edd38968ec0736000456';

    env.ELASTICIO_COMPONENT_PATH = '/mocha_spec/integration_component';

    env.ELASTICIO_API_URI = `http://localhost:${FAKE_API_PORT}`;

    env.ELASTICIO_API_USERNAME = 'test@test.com';
    env.ELASTICIO_API_KEY = '5559edd';
    env.ELASTICIO_FLOW_WEBHOOK_URI = `https://in.elastic.io/hooks/${env.ELASTICIO_FLOW_ID}`;

    env.ELASTICIO_MESSAGE_CRYPTO_PASSWORD = 'testCryptoPassword';
    env.ELASTICIO_MESSAGE_CRYPTO_IV = 'iv=any16_symbols';
    env.ELASTICIO_BACKCHANNEL_EXCHANGE = `${PREFIX}:BACKCHANNEL_EXCHANGE`;

    env.DEBUG = 'sailor:debug';
}

function mockApiTaskStepResponse(response) {
    const defaultResponse = {
        config: {
            apiKey: 'secret'
        },
        snapshot: {
            lastModifiedDate: 123456789
        }
    };

    nock(env.ELASTICIO_API_URI)
        .matchHeader('Connection', 'Keep-Alive')
        .get(`/v1/tasks/${env.ELASTICIO_FLOW_ID}/steps/${env.ELASTICIO_STEP_ID}`)
        .reply(200, Object.assign(defaultResponse, response));

    nock(env.ELASTICIO_API_URI)
        .matchHeader('Connection', 'Keep-Alive')
        .get(`/v1/tasks/${env.ELASTICIO_FLOW_ID}/steps/${env.ELASTICIO_STEP_ID}`)
        .reply(200, Object.assign(defaultResponse, response));
}

let fakeApiServer;

async function fakeApiServerStart(response, { responseCode = 200, logger = console } = {}) {
    const app = express();
    const requests = [];

    const defaultResponse = {
        config: {
            apiKey: 'secret'
        },
        snapshot: {
            lastModifiedDate: 123456789
        }
    };

    app.get(`/v1/tasks/${env.ELASTICIO_FLOW_ID}/steps/${env.ELASTICIO_STEP_ID}`, (req, res) => {
        requests.push({
            url: req.url // @todo pick certain properties, not the entire res
        });

        res
            .json(Object.assign(defaultResponse, response))
            .end(responseCode);
    });
    let server;
    await new Promise((resolve) => {
        server = app.listen(FAKE_API_PORT, 'localhost', () => {
            logger.info(`FakeApiServer listening on localhost:${FAKE_API_PORT}`);
            resolve();
        });
    });
    fakeApiServer = { app, server, requests };
    return fakeApiServer;
}

async function fakeApiServerStop() {
    if (!fakeApiServer || !fakeApiServer.server) {
        return;
    }
    await new Promise(resolve => fakeApiServer.server.close(resolve));
}

exports.PREFIX = PREFIX;

exports.amqp = function amqp() {
    return new AmqpHelper();
};

exports.amqpGlobal = function amqp() {
    return new AmqpHelperGlobal();
};

exports.prepareEnv = prepareEnv;
exports.mockApiTaskStepResponse = mockApiTaskStepResponse;
exports.fakeApiServerStart = fakeApiServerStart;
exports.fakeApiServerStop = fakeApiServerStop;
exports.ShellTester = ShellTester;
