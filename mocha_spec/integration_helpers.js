'use strict';

const co = require('co');
const amqplib = require('amqplib');
const { EventEmitter } = require('events');
const PREFIX = 'sailor_nodejs_integration_test';
const nock = require('nock');

const env = process.env;

class AmqpHelper extends EventEmitter {
    constructor() {
        super();

        this.httpReplyQueueName = PREFIX + 'request_reply_queue';
        this.httpReplyQueueRoutingKey = PREFIX + 'request_reply_routing_key';
        this.nextStepQueue = PREFIX + '_next_step_queue';
        this.nextStepErrorQueue = PREFIX + '_next_step_queue_errors';

        this.dataMessages = [];
        this.errorMessages = [];
    }

    prepareEnv() {
        env.ELASTICIO_LISTEN_MESSAGES_ON = PREFIX + ':messages';
        env.ELASTICIO_PUBLISH_MESSAGES_TO = PREFIX + ':exchange';
        env.ELASTICIO_DATA_ROUTING_KEY = PREFIX + ':routing_key:message';
        env.ELASTICIO_ERROR_ROUTING_KEY = PREFIX + ':routing_key:error';
        env.ELASTICIO_REBOUND_ROUTING_KEY = PREFIX + ':routing_key:rebound';
        env.ELASTICIO_SNAPSHOT_ROUTING_KEY = PREFIX + ':routing_key:snapshot';

        env.ELASTICIO_TIMEOUT = 3000;
    }

    // optional callback `done` is used in order to pass exceptions (e.g. from assertions in tests) to mocha callback
    on(event, handler, done = undefined) {
        if (!done) {
            return super.on(event, handler);
        }

        return super.on(event, (...args) => {
            try {
                handler(...args);
                done();
            } catch (e) {
                done(e);
            }
        });
    }

    publishMessage(message, { parentMessageId, threadId } = {}, headers = {}) {
        return this.subscriptionChannel.publish(
            env.ELASTICIO_LISTEN_MESSAGES_ON,
            env.ELASTICIO_DATA_ROUTING_KEY,
            new Buffer(JSON.stringify(message)), {
                headers: Object.assign({
                    execId: env.ELASTICIO_EXEC_ID,
                    taskId: env.ELASTICIO_FLOW_ID,
                    workspaceId: env.ELASTICIO_WORKSPACE_ID,
                    userId: env.ELASTICIO_USER_ID,
                    threadId,
                    stepId: message.headers.stepId,
                    messageId: parentMessageId
                }, headers)
            });
    }

    *prepareQueues() {
        const amqp = yield amqplib.connect(env.ELASTICIO_AMQP_URI);
        const subscriptionChannel = yield amqp.createChannel();
        const publishChannel = yield amqp.createChannel();

        yield subscriptionChannel.assertQueue(env.ELASTICIO_LISTEN_MESSAGES_ON);
        yield publishChannel.assertQueue(this.nextStepQueue);
        yield publishChannel.assertQueue(this.nextStepErrorQueue);

        const exchangeOptions = {
            durable: true,
            autoDelete: false
        };

        yield subscriptionChannel.assertExchange(env.ELASTICIO_LISTEN_MESSAGES_ON, 'direct', exchangeOptions);
        yield publishChannel.assertExchange(env.ELASTICIO_PUBLISH_MESSAGES_TO, 'direct', exchangeOptions);

        yield subscriptionChannel.bindQueue(
            env.ELASTICIO_LISTEN_MESSAGES_ON,
            env.ELASTICIO_LISTEN_MESSAGES_ON,
            env.ELASTICIO_DATA_ROUTING_KEY);

        yield publishChannel.bindQueue(
            this.nextStepQueue,
            env.ELASTICIO_PUBLISH_MESSAGES_TO,
            env.ELASTICIO_DATA_ROUTING_KEY);

        yield publishChannel.bindQueue(
            this.nextStepErrorQueue,
            env.ELASTICIO_PUBLISH_MESSAGES_TO,
            env.ELASTICIO_ERROR_ROUTING_KEY);

        yield publishChannel.assertQueue(this.httpReplyQueueName);
        yield publishChannel.bindQueue(
            this.httpReplyQueueName,
            env.ELASTICIO_PUBLISH_MESSAGES_TO,
            this.httpReplyQueueRoutingKey);

        yield publishChannel.purgeQueue(this.nextStepQueue);
        yield publishChannel.purgeQueue(this.nextStepErrorQueue);
        yield publishChannel.purgeQueue(env.ELASTICIO_LISTEN_MESSAGES_ON);

        this.subscriptionChannel = subscriptionChannel;
        this.publishChannel = publishChannel;
    }

    cleanUp() {
        this.removeAllListeners();
        return Promise.all([
            this.publishChannel.cancel('sailor_nodejs_1'),
            this.publishChannel.cancel('sailor_nodejs_2'),
            this.publishChannel.cancel('sailor_nodejs_3')
        ]);
    }

    prepare() {
        const that = this;
        return co(function * gen() {
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
        this.publishChannel.ack(message);

        const emittedMessage = JSON.parse(message.content.toString());

        const data = {
            properties: message.properties,
            body: emittedMessage.body,
            emittedMessage
        };

        this.dataMessages.push(data);
        this.emit('data', data, queue);

        // publishChannel.cancel('sailor_nodejs');
        // done();
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
    env.ELASTICIO_RABBITMQ_PREFETCH_SAILOR = '10';
    env.ELASTICIO_FLOW_ID = '5559edd38968ec0736000003';
    env.ELASTICIO_STEP_ID = 'step_1';
    env.ELASTICIO_EXEC_ID = 'some-exec-id';

    env.ELASTICIO_WORKSPACE_ID = '5559edd38968ec073600683';
    env.ELASTICIO_CONTAINER_ID = 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948';

    env.ELASTICIO_USER_ID = '5559edd38968ec0736000002';
    env.ELASTICIO_COMP_ID = '5559edd38968ec0736000456';

    env.ELASTICIO_COMPONENT_PATH = '/mocha_spec/integration_component';

    env.ELASTICIO_API_URI = 'https://apidotelasticidotio';
    env.ELASTICIO_API_USERNAME = 'test@test.com';
    env.ELASTICIO_API_KEY = '5559edd';
    env.ELASTICIO_FLOW_WEBHOOK_URI = 'https://in.elastic.io/hooks/' + env.ELASTICIO_FLOW_ID;

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
}

exports.PREFIX = PREFIX;

exports.amqp = function amqp() {
    return new AmqpHelper();
};

exports.prepareEnv = prepareEnv;
exports.mockApiTaskStepResponse = mockApiTaskStepResponse;
