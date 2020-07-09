'use strict';

const amqplib = require('amqplib');
const { EventEmitter } = require('events');
const PREFIX = 'sailor_nodejs_integration_test';
const nock = require('nock');
const ShellTester = require('./ShellTester');
const express = require('express');
const encryptor = require('../../lib/encryptor');
const FAKE_API_PORT = 1244; // most likely the port won't be taken – https://www.adminsub.net/tcp-udp-port-finder/1244

const env = process.env;

// @todo move AmqpHelper to dedicated file (will be done in the future refactoring)
class AmqpHelper extends EventEmitter {
    constructor() {
        super();

        this.httpReplyQueueName = PREFIX + 'request_reply_queue';
        this.httpReplyQueueRoutingKey = PREFIX + 'request_reply_routing_key';
        this.nextStepQueue = PREFIX + '_next_step_queue';
        this.nextStepErrorQueue = PREFIX + '_next_step_queue_errors';

        this.dataMessages = [];
        this.errorMessages = [];

        this._amqp = null;

        this.counterData = 0;
    }

    prepareEnv() {
        env.ELASTICIO_LISTEN_MESSAGES_ON = PREFIX + ':messages';
        env.ELASTICIO_PUBLISH_MESSAGES_TO = PREFIX + ':exchange';

        env.ELASTICIO_BACK_CHANNEL = PREFIX + ':back_channel';

        env.ELASTICIO_DATA_ROUTING_KEY = PREFIX + ':routing_key:message';
        env.ELASTICIO_ERROR_ROUTING_KEY = PREFIX + ':routing_key:error';
        env.ELASTICIO_REBOUND_ROUTING_KEY = PREFIX + ':routing_key:rebound';
        env.ELASTICIO_SNAPSHOT_ROUTING_KEY = PREFIX + ':routing_key:snapshot';
        env.ELASTICIO_AMQP_PUBLISH_RETRY_ATTEMPTS = 3;
        env.ELASTICIO_AMQP_PUBLISH_MAX_RETRY_DELAY = 60 * 1000;
        env.ELASTICIO_SNAPSHOTS_SERVICE_BASE_URL = 'https://localhost:2345';
    }

    publishMessage(message, { parentMessageId, threadId } = {}, headers = {}) {
        let msgHeaders = Object.assign({
            execId: env.ELASTICIO_EXEC_ID,
            taskId: env.ELASTICIO_FLOW_ID,
            workspaceId: env.ELASTICIO_WORKSPACE_ID,
            userId: env.ELASTICIO_USER_ID,
            threadId,
            stepId: message.headers.stepId,
            messageId: parentMessageId
        }, headers);

        const protocolVersion = Number(msgHeaders.protocolVersion || 1);

        let routingKey = env.ELASTICIO_DATA_ROUTING_KEY;

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
                headers: msgHeaders
            }
        );
    }

    async prepareQueues() {
        const amqp = await amqplib.connect(env.ELASTICIO_AMQP_URI);
        this._amqp = amqp;
        const subscriptionChannel = await amqp.createChannel();

        const backChannel = await amqp.createChannel();

        const publishChannel = await amqp.createChannel();

        await subscriptionChannel.assertQueue(env.ELASTICIO_LISTEN_MESSAGES_ON);

        // await backChannel.assertQueue(env.ELASTICIO_BACK_CHANNEL);

        await publishChannel.assertQueue(this.nextStepQueue);
        await publishChannel.assertQueue(this.nextStepErrorQueue);

        const exchangeOptions = {
            durable: true,
            autoDelete: false
        };

        await subscriptionChannel.assertExchange(env.ELASTICIO_LISTEN_MESSAGES_ON, 'direct', exchangeOptions);
        await publishChannel.assertExchange(env.ELASTICIO_PUBLISH_MESSAGES_TO, 'direct', exchangeOptions);

        // await backChannel.assertExchange(env.ELASTICIO_BACK_CHANNEL, 'direct', exchangeOptions);

        await subscriptionChannel.bindQueue(
            env.ELASTICIO_LISTEN_MESSAGES_ON,
            env.ELASTICIO_LISTEN_MESSAGES_ON,
            env.ELASTICIO_DATA_ROUTING_KEY);

        // await backChannel.bindQueue(
        //     env.ELASTICIO_BACK_CHANNEL,
        //     env.ELASTICIO_BACK_CHANNEL,
        //     '*');

        await publishChannel.bindQueue(
            this.nextStepQueue,
            env.ELASTICIO_PUBLISH_MESSAGES_TO,
            env.ELASTICIO_DATA_ROUTING_KEY);

        await publishChannel.bindQueue(
            this.nextStepErrorQueue,
            env.ELASTICIO_PUBLISH_MESSAGES_TO,
            env.ELASTICIO_ERROR_ROUTING_KEY);

        await publishChannel.assertQueue(this.httpReplyQueueName);
        await publishChannel.bindQueue(
            this.httpReplyQueueName,
            env.ELASTICIO_PUBLISH_MESSAGES_TO,
            this.httpReplyQueueRoutingKey);

        await publishChannel.purgeQueue(this.nextStepQueue);
        await publishChannel.purgeQueue(this.nextStepErrorQueue);
        await publishChannel.purgeQueue(this.httpReplyQueueName);
        await publishChannel.purgeQueue(env.ELASTICIO_LISTEN_MESSAGES_ON);

        // await backChannel.purgeQueue(env.ELASTICIO_BACK_CHANNEL);

        this.subscriptionChannel = subscriptionChannel;

        this.backChannel = backChannel;

        this.publishChannel = publishChannel;
    }

    async cleanUp() {
        this.removeAllListeners();
        this.dataMessages = [];
        await Promise.all([
            this.publishChannel.cancel('sailor_nodejs_1'),
            this.publishChannel.cancel('sailor_nodejs_2'),
            this.publishChannel.cancel('sailor_nodejs_3')
        ]);
        await this._amqp.close();
    }

    async prepare() {
        const that = this;
        that.prepareEnv();
        await that.prepareQueues();

        await that.publishChannel.consume(
            that.nextStepQueue,
            that.consumer.bind(that, that.nextStepQueue),
            { consumerTag: 'sailor_nodejs_1' }
        );

        await that.publishChannel.consume(
            that.nextStepErrorQueue,
            that.consumer.bind(that, that.nextStepErrorQueue),
            { consumerTag: 'sailor_nodejs_2' }
        );

        await that.publishChannel.consume(
            that.httpReplyQueueName,
            that.consumer.bind(that, that.httpReplyQueueName),
            { consumerTag: 'sailor_nodejs_3' }
        );
    }

    consumer(queue, message) {
        this.dataMessages.push(message);
        this.emit('data', message, queue);
    }

    async retrieveAllMessagesNotConsumedBySailor(timeout = 1000) {
        const consumerTag = 'tmp_consumer';
        const data = [];

        await this.subscriptionChannel.consume(
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
        await new Promise(resolve => setTimeout(resolve, timeout));

        await this.subscriptionChannel.cancel(consumerTag);

        return data;
    }
}

class AmqpHelperGlobal extends EventEmitter {
    constructor() {
        super();

        this.httpReplyQueueName = PREFIX + 'request_reply_queue';
        this.httpReplyQueueRoutingKey = PREFIX + 'request_reply_routing_key';
        this.nextStepQueue = PREFIX + '_next_step_queue';
        this.nextStepErrorQueue = PREFIX + '_next_step_queue_errors';

        this.dataMessages = [];
        this.errorMessages = [];

        this._amqp = null;

        this.counterData = 0;
    }

    prepareEnv() {
        env.ELASTICIO_LISTEN_MESSAGES_ON = PREFIX + ':messages';
        env.ELASTICIO_PUBLISH_MESSAGES_TO = PREFIX + ':exchange';

        env.ELASTICIO_BACK_CHANNEL = PREFIX + ':back_channel';

        env.ELASTICIO_DATA_ROUTING_KEY = PREFIX + ':routing_key:message';
        env.ELASTICIO_ERROR_ROUTING_KEY = PREFIX + ':routing_key:error';
        env.ELASTICIO_REBOUND_ROUTING_KEY = PREFIX + ':routing_key:rebound';
        env.ELASTICIO_SNAPSHOT_ROUTING_KEY = PREFIX + ':routing_key:snapshot';
        env.ELASTICIO_AMQP_PUBLISH_RETRY_ATTEMPTS = 3;
        env.ELASTICIO_AMQP_PUBLISH_MAX_RETRY_DELAY = 60 * 1000;
    }

    publishMessage(message, { parentMessageId, threadId } = {}, headers = {}) {
        let msgHeaders = Object.assign({
            execId: env.ELASTICIO_EXEC_ID,
            taskId: env.ELASTICIO_FLOW_ID,
            workspaceId: env.ELASTICIO_WORKSPACE_ID,
            userId: env.ELASTICIO_USER_ID,
            threadId,
            stepId: message.headers.stepId,
            messageId: parentMessageId
        }, headers);

        const protocolVersion = Number(msgHeaders.protocolVersion || 1);

        let routingKey = env.ELASTICIO_DATA_ROUTING_KEY;

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
                headers: msgHeaders
            }
        );
    }

    async prepareQueues() {
        const amqp = await amqplib.connect(env.ELASTICIO_AMQP_URI);
        this._amqp = amqp;
        const subscriptionChannel = await amqp.createChannel();

        const backChannel = await amqp.createChannel();

        const publishChannel = await amqp.createChannel();

        await subscriptionChannel.assertQueue(env.ELASTICIO_LISTEN_MESSAGES_ON);

        // await backChannel.assertQueue(env.ELASTICIO_BACK_CHANNEL);

        await publishChannel.assertQueue(this.nextStepQueue);
        await publishChannel.assertQueue(this.nextStepErrorQueue);

        const exchangeOptions = {
            durable: true,
            autoDelete: false
        };

        await subscriptionChannel.assertExchange(env.ELASTICIO_LISTEN_MESSAGES_ON, 'direct', exchangeOptions);
        await publishChannel.assertExchange(env.ELASTICIO_BACK_CHANNEL, 'direct', exchangeOptions);

        // await backChannel.assertExchange(env.ELASTICIO_BACK_CHANNEL, 'direct', exchangeOptions);

        await subscriptionChannel.bindQueue(
            env.ELASTICIO_LISTEN_MESSAGES_ON,
            env.ELASTICIO_LISTEN_MESSAGES_ON,
            env.ELASTICIO_DATA_ROUTING_KEY);

        // await backChannel.bindQueue(
        //     env.ELASTICIO_BACK_CHANNEL,
        //     env.ELASTICIO_BACK_CHANNEL,
        //     '*');

        await publishChannel.bindQueue(
            this.nextStepQueue,
            env.ELASTICIO_BACK_CHANNEL,
            env.ELASTICIO_DATA_ROUTING_KEY);

        await publishChannel.bindQueue(
            this.nextStepErrorQueue,
            env.ELASTICIO_BACK_CHANNEL,
            env.ELASTICIO_ERROR_ROUTING_KEY);

        await publishChannel.assertQueue(this.httpReplyQueueName);
        await publishChannel.bindQueue(
            this.httpReplyQueueName,
            env.ELASTICIO_BACK_CHANNEL,
            this.httpReplyQueueRoutingKey);

        await publishChannel.purgeQueue(this.nextStepQueue);
        await publishChannel.purgeQueue(this.nextStepErrorQueue);
        await publishChannel.purgeQueue(this.httpReplyQueueName);
        await publishChannel.purgeQueue(env.ELASTICIO_LISTEN_MESSAGES_ON);

        // await backChannel.purgeQueue(env.ELASTICIO_BACK_CHANNEL);

        this.subscriptionChannel = subscriptionChannel;

        this.backChannel = backChannel;

        this.publishChannel = publishChannel;
    }

    async cleanUp() {
        this.removeAllListeners();
        this.dataMessages = [];
        await Promise.all([
            this.publishChannel.cancel('sailor_nodejs_1'),
            this.publishChannel.cancel('sailor_nodejs_2'),
            this.publishChannel.cancel('sailor_nodejs_3')
        ]);
        await this._amqp.close();
    }

    async prepare() {
        const that = this;
        that.prepareEnv();
        await that.prepareQueues();

        await that.publishChannel.consume(
            that.nextStepQueue,
            that.consumer.bind(that, that.nextStepQueue),
            { consumerTag: 'sailor_nodejs_1' }
        );

        await that.publishChannel.consume(
            that.nextStepErrorQueue,
            that.consumer.bind(that, that.nextStepErrorQueue),
            { consumerTag: 'sailor_nodejs_2' }
        );

        await that.publishChannel.consume(
            that.httpReplyQueueName,
            that.consumer.bind(that, that.httpReplyQueueName),
            { consumerTag: 'sailor_nodejs_3' }
        );
    }

    consumer(queue, message) {
        this.dataMessages.push(message);
        this.emit('data', message, queue);
    }

    async retrieveAllMessagesNotConsumedBySailor(timeout = 1000) {
        const consumerTag = 'tmp_consumer';
        const data = [];

        await this.subscriptionChannel.consume(
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
        await new Promise(resolve => setTimeout(resolve, timeout));

        await this.subscriptionChannel.cancel(consumerTag);

        return data;
    }
}

function amqp() {
    const handle = {
        //eslint-disable-next-line no-empty-function
        getMessages() {
        }
    };
    return handle;
}

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
    env.ELASTICIO_FLOW_WEBHOOK_URI = 'https://in.elastic.io/hooks/' + env.ELASTICIO_FLOW_ID;

    env.ELASTICIO_MESSAGE_CRYPTO_PASSWORD = 'testCryptoPassword';
    env.ELASTICIO_MESSAGE_CRYPTO_IV = 'iv=any16_symbols';

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
    await new Promise(resolve => {
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
