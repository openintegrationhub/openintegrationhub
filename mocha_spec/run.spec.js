'use strict';

const nock = require('nock');
const expect = require('chai').expect;
const amqplib = require('amqplib');
const co = require('co');
const express = require('express');
const bodyParser = require('body-parser');
const sinon = require('sinon');
const logging = require('../lib/logging.js');

const PREFIX = 'sailor_nodejs_integration_test';

describe('Integration Test', () => {
    process.env.ELASTICIO_AMQP_URI = 'amqp://guest:guest@localhost:5672';
    process.env.ELASTICIO_RABBITMQ_PREFETCH_SAILOR = '10';
    process.env.ELASTICIO_FLOW_ID = '5559edd38968ec0736000003';
    process.env.ELASTICIO_STEP_ID = 'step_1';
    process.env.ELASTICIO_EXEC_ID = 'some-exec-id';

    process.env.ELASTICIO_USER_ID = '5559edd38968ec0736000002';
    process.env.ELASTICIO_COMP_ID = '5559edd38968ec0736000456';

    process.env.ELASTICIO_LISTEN_MESSAGES_ON = PREFIX + ':messages';
    process.env.ELASTICIO_PUBLISH_MESSAGES_TO = PREFIX + ':exchange';
    process.env.ELASTICIO_DATA_ROUTING_KEY = PREFIX + ':routing_key:message';
    process.env.ELASTICIO_ERROR_ROUTING_KEY = PREFIX + ':routing_key:error';
    process.env.ELASTICIO_REBOUND_ROUTING_KEY = PREFIX + ':routing_key:rebound';
    process.env.ELASTICIO_SNAPSHOT_ROUTING_KEY = PREFIX + ':routing_key:snapshot';

    process.env.ELASTICIO_COMPONENT_PATH = '/mocha_spec/integration_component';

    process.env.ELASTICIO_API_URI = 'https://apidotelasticidotio';
    process.env.ELASTICIO_API_USERNAME = 'test@test.com';
    process.env.ELASTICIO_API_KEY = '5559edd';
    process.env.ELASTICIO_FLOW_WEBHOOK_URI = 'https://in.elastic.io/hooks/' + process.env.ELASTICIO_FLOW_ID;

    process.env.DEBUG = 'sailor:debug';

    process.env.ELASTICIO_TIMEOUT = 3000;

    let subscriptionChannel;
    let publishChannel;
    const customers = [
        {
            name: 'Homer Simpson'
        },
        {
            name: 'Marge Simpson'
        }
    ];
    const inputMessage = {
        headers: {},
        body: {
            message: 'Just do it!'
        }
    };

    const httpReplyQueueName = PREFIX + 'request_reply_queue';
    const httpReplyQueueRoutingKey = PREFIX + 'request_reply_routing_key';
    const nextStepQueue = PREFIX + '_next_step_queue';
    const nextStepErrorQueue = PREFIX + '_next_step_queue_errors';
    const traceId = PREFIX + '_trace_id_123456';
    const emittedMessageId = 'f45be600-f770-11e6-b42d-b187bfbf19fd';

    let run;

    beforeEach((done) => {

        process.env.ELASTICIO_FUNCTION = 'init_trigger';

        co(function* gen() {
            const amqp = yield amqplib.connect(process.env.ELASTICIO_AMQP_URI);
            subscriptionChannel = yield amqp.createChannel();
            publishChannel = yield amqp.createChannel();

            yield subscriptionChannel.assertQueue(process.env.ELASTICIO_LISTEN_MESSAGES_ON);
            yield publishChannel.assertQueue(nextStepQueue);
            yield publishChannel.assertQueue(nextStepErrorQueue);

            const exchangeOptions = {
                durable: true,
                autoDelete: false
            };
            yield subscriptionChannel.assertExchange(process.env.ELASTICIO_LISTEN_MESSAGES_ON, 'direct', exchangeOptions);
            yield publishChannel.assertExchange(process.env.ELASTICIO_PUBLISH_MESSAGES_TO, 'direct', exchangeOptions);

            yield subscriptionChannel.bindQueue(
                process.env.ELASTICIO_LISTEN_MESSAGES_ON,
                process.env.ELASTICIO_LISTEN_MESSAGES_ON,
                process.env.ELASTICIO_DATA_ROUTING_KEY);

            yield publishChannel.bindQueue(
                nextStepQueue,
                process.env.ELASTICIO_PUBLISH_MESSAGES_TO,
                process.env.ELASTICIO_DATA_ROUTING_KEY);

            yield publishChannel.bindQueue(
                nextStepErrorQueue,
                process.env.ELASTICIO_PUBLISH_MESSAGES_TO,
                process.env.ELASTICIO_ERROR_ROUTING_KEY);

            yield publishChannel.assertQueue(httpReplyQueueName);
            yield publishChannel.bindQueue(
                httpReplyQueueName,
                process.env.ELASTICIO_PUBLISH_MESSAGES_TO,
                httpReplyQueueRoutingKey);

            yield publishChannel.purgeQueue(nextStepQueue);
            yield publishChannel.purgeQueue(nextStepErrorQueue);
            yield publishChannel.purgeQueue(process.env.ELASTICIO_LISTEN_MESSAGES_ON);
            done();
        }).catch(done);
    });

    afterEach((done) => {
        delete process.env.STARTUP_REQUIRED;
        delete process.env.ELASTICIO_FUNCTION;

        co(function* gen() {
            yield run.disconnect();
            done();
        }).catch(done);
    });

    it('should run sailor successfully', (done) => {

        const parentMessageId = 'parent_message_1234567890';

        subscriptionChannel.publish(
            process.env.ELASTICIO_LISTEN_MESSAGES_ON,
            process.env.ELASTICIO_DATA_ROUTING_KEY,
            new Buffer(JSON.stringify(inputMessage)),
            {
                headers: {
                    execId: process.env.ELASTICIO_EXEC_ID,
                    taskId: process.env.ELASTICIO_FLOW_ID,
                    userId: process.env.ELASTICIO_USER_ID,
                    messageId: parentMessageId,
                    'x-eio-meta-trace-id': traceId
                }
            });

        nock('https://apidotelasticidotio')
            .log(console.log)
            .get('/v1/tasks/5559edd38968ec0736000003/steps/step_1')
            .reply(200, {
                config: {
                    apiKey: 'secret'
                },
                snapshot: {
                    lastModifiedDate: 123456789
                }
            });

        nock('https://api.acme.com')
            .log(console.log)
            .post('/subscribe')
            .reply(200, {
                id: 'subscription_12345'
            })
            .get('/customers')
            .reply(200, customers);

        publishChannel.consume(nextStepQueue, (message) => {
                publishChannel.ack(message);

                const emittedMessage = JSON.parse(message.content.toString());

                delete message.properties.headers.start;
                delete message.properties.headers.end;
                delete message.properties.headers.cid;

                console.log(message.properties);

                expect(message.properties).to.eql({
                    contentType: 'application/json',
                    contentEncoding: 'utf8',
                    headers: {
                        execId: process.env.ELASTICIO_EXEC_ID,
                        taskId: process.env.ELASTICIO_FLOW_ID,
                        userId: process.env.ELASTICIO_USER_ID,
                        stepId: process.env.ELASTICIO_STEP_ID,
                        compId: process.env.ELASTICIO_COMP_ID,
                        function: process.env.ELASTICIO_FUNCTION,
                        'x-eio-meta-trace-id': traceId,
                        parentMessageId: parentMessageId,
                        messageId: emittedMessageId
                    },
                    deliveryMode: undefined,
                    priority: undefined,
                    correlationId: undefined,
                    replyTo: undefined,
                    expiration: undefined,
                    messageId: undefined,
                    timestamp: undefined,
                    type: undefined,
                    userId: undefined,
                    appId: undefined,
                    clusterId: undefined,
                });
                expect(emittedMessage.body).to.deep.equal({
                    originalMsg: inputMessage,
                    customers: customers,
                    subscription: {
                        id: 'subscription_12345',
                        cfg: {
                            apiKey: 'secret'
                        }
                    }
                });

                publishChannel.cancel('sailor_nodejs');

                done();
            },
            {
                consumerTag: 'sailor_nodejs'
            });
        run = requireRun();
    });

    it('should execute startup successfully', (done) => {

        process.env.ELASTICIO_STARTUP_REQUIRED = '1';

        const app = express();
        const port = 8080;

        app.use(bodyParser.json());

        app.post('/webhooks', (req, res) => {
            expect(req.body).to.eql({
                url: 'https://in.elastic.io/hooks/5559edd38968ec0736000003'
            });
            res.json({
                id: 'webhook_123'
            });
        });

        nock('https://apidotelasticidotio')
            .log(console.log)
            .get('/v1/tasks/5559edd38968ec0736000003/steps/step_1')
            .reply(200, {
                config: {
                    apiKey: 'secret'
                },
                snapshot: {
                    lastModifiedDate: 123456789
                }
            });

        nock('https://api.acme.com')
            .log(console.log)
            .post('/subscribe')
            .reply(200, {
                id: 'subscription_12345'
            })
            .get('/customers')
            .reply(200, customers);

        nock.enableNetConnect('localhost');

        app.listen(port, () => {
            console.log('Express listening on port', port);


            subscriptionChannel.publish(
                process.env.ELASTICIO_LISTEN_MESSAGES_ON,
                process.env.ELASTICIO_DATA_ROUTING_KEY,
                new Buffer(JSON.stringify(inputMessage)),
                {
                    headers: {
                        execId: process.env.ELASTICIO_EXEC_ID,
                        taskId: process.env.ELASTICIO_FLOW_ID,
                        userId: process.env.ELASTICIO_USER_ID
                    }
                });

            publishChannel.consume(nextStepQueue, (message) => {
                    publishChannel.ack(message);

                    const emittedMessage = JSON.parse(message.content.toString());

                    delete message.properties.headers.start;
                    delete message.properties.headers.end;
                    delete message.properties.headers.cid;

                    console.log(message.properties.headers);

                    expect(message.properties.headers).to.eql({
                        execId: process.env.ELASTICIO_EXEC_ID,
                        taskId: process.env.ELASTICIO_FLOW_ID,
                        userId: process.env.ELASTICIO_USER_ID,
                        stepId: process.env.ELASTICIO_STEP_ID,
                        compId: process.env.ELASTICIO_COMP_ID,
                        function: process.env.ELASTICIO_FUNCTION,
                        messageId: emittedMessageId
                    });
                    expect(emittedMessage.body).to.deep.equal({
                        originalMsg: inputMessage,
                        customers: customers,
                        subscription: {
                            id: 'subscription_12345',
                            cfg: {
                                apiKey: 'secret'
                            }
                        }
                    });

                    publishChannel.cancel('sailor_nodejs');

                    done();
                },
                {
                    consumerTag: 'sailor_nodejs'
                });
            run = requireRun();
        });
    });

    it('should send http reply successfully', (done) => {

        process.env.ELASTICIO_FUNCTION = 'http_reply_action';

        subscriptionChannel.publish(
            process.env.ELASTICIO_LISTEN_MESSAGES_ON,
            process.env.ELASTICIO_DATA_ROUTING_KEY,
            new Buffer(JSON.stringify(inputMessage)),
            {
                headers: {
                    execId: process.env.ELASTICIO_EXEC_ID,
                    taskId: process.env.ELASTICIO_FLOW_ID,
                    userId: process.env.ELASTICIO_USER_ID,
                    reply_to: httpReplyQueueRoutingKey
                }
            });

        nock('https://apidotelasticidotio')
            .log(console.log)
            .get('/v1/tasks/5559edd38968ec0736000003/steps/step_1')
            .reply(200, {
                config: {
                    apiKey: 'secret'
                },
                snapshot: {
                    lastModifiedDate: 123456789
                }
            });

        nock('https://api.acme.com')
            .log(console.log)
            .post('/subscribe')
            .reply(200, {
                id: 'subscription_12345'
            })
            .get('/customers')
            .reply(200, customers);

        publishChannel.consume(httpReplyQueueName, (message) => {
                publishChannel.ack(message);

                const emittedMessage = JSON.parse(message.content.toString());
                console.log(emittedMessage);

                delete message.properties.headers.start;
                delete message.properties.headers.end;
                delete message.properties.headers.cid;

                expect(message.properties.headers.messageId).to.be.a('string');
                delete message.properties.headers.messageId;

                expect(message.properties.headers).to.eql({
                    execId: process.env.ELASTICIO_EXEC_ID,
                    taskId: process.env.ELASTICIO_FLOW_ID,
                    userId: process.env.ELASTICIO_USER_ID,
                    stepId: process.env.ELASTICIO_STEP_ID,
                    compId: process.env.ELASTICIO_COMP_ID,
                    function: process.env.ELASTICIO_FUNCTION,
                    reply_to: httpReplyQueueRoutingKey
                });
                expect(emittedMessage).to.eql({
                    headers: {
                        'content-type': 'text/plain'
                    },
                    body: 'Ok',
                    statusCode: 200
                });

                publishChannel.cancel('sailor_nodejs');

                done();
            },
            {
                consumerTag: 'sailor_nodejs'
            });

        run = requireRun();
    });

    it('should publish init errors to RabbitMQ', (done) => {

        const logCriticalErrorStub = sinon.stub(logging, 'criticalError');

        process.env.ELASTICIO_FUNCTION = 'fails_to_init';

        nock('https://apidotelasticidotio')
            .log(console.log)
            .get('/v1/tasks/5559edd38968ec0736000003/steps/step_1')
            .reply(200, {
                config: {
                    apiKey: 'secret'
                },
                snapshot: {
                    lastModifiedDate: 123456789
                }
            });

        publishChannel.consume(nextStepErrorQueue, (message) => {
                publishChannel.ack(message);
                const error = JSON.parse(message.content.toString());
                expect(JSON.parse(error.error).message).to.equal('OMG. I cannot init');

                expect(message.properties.headers).to.eql({
                    execId: process.env.ELASTICIO_EXEC_ID,
                    taskId: process.env.ELASTICIO_FLOW_ID,
                    userId: process.env.ELASTICIO_USER_ID
                });

                done();
            },
            {
                consumerTag: 'sailor_nodejs'
            });

        run = requireRun();
    });

    it('should augment passthrough property with data', done => {
        process.env.ELASTICIO_STEP_ID = 'step_2';
        process.env.ELASTICIO_FLOW_ID = '5559edd38968ec0736000003';
        process.env.ELASTICIO_FUNCTION = 'emit_data';

        nock('https://apidotelasticidotio')
            .get('/v1/tasks/5559edd38968ec0736000003/steps/step_2')
            .reply(200, {
                config: {
                    apiKey: 'secret'
                },
                snapshot: {
                    lastModifiedDate: 123456789
                },
                is_passthrough: true
            });


        const psMsg = Object.assign(inputMessage, {
            passthrough: {
                step_1: {
                    id: '34',
                    body: {},
                    attachments: {}
                }
            }
        });
        subscriptionChannel.publish(
            process.env.ELASTICIO_LISTEN_MESSAGES_ON,
            process.env.ELASTICIO_DATA_ROUTING_KEY,
            new Buffer(JSON.stringify(psMsg)),
            {
                headers: {
                    execId: process.env.ELASTICIO_EXEC_ID,
                    taskId: process.env.ELASTICIO_FLOW_ID,
                    userId: process.env.ELASTICIO_USER_ID,
                    'x-eio-meta-trace-id': traceId
                }
            });

        publishChannel.consume(nextStepQueue, (message) => {
                publishChannel.ack(message);
                const emittedMessage = JSON.parse(message.content.toString());

                expect(emittedMessage.passthrough).to.deep.eql({
                    step_1: {
                        id: '34',
                        body: {},
                        attachments: {}
                    },
                    step_2: {
                        id: emittedMessageId,
                        headers: {
                            'x-custom-component-header': '123_abc'
                        },
                        body: {
                            id: 'someId',
                            hai: 'there'
                        }
                    }
                });

                delete message.properties.headers.start;
                delete message.properties.headers.end;
                delete message.properties.headers.cid;
                console.log(message.properties.headers);

                expect(message.properties.headers).to.deep.equal({
                    taskId: process.env.ELASTICIO_FLOW_ID,
                    execId: process.env.ELASTICIO_EXEC_ID,
                    userId: process.env.ELASTICIO_USER_ID,
                    'x-eio-meta-trace-id': traceId,
                    stepId: process.env.ELASTICIO_STEP_ID,
                    compId: process.env.ELASTICIO_COMP_ID,
                    function: process.env.ELASTICIO_FUNCTION,
                    messageId:emittedMessageId
                });


                delete message.properties.headers;

                expect(message.properties).to.deep.eql({
                    contentType: 'application/json',
                    contentEncoding: 'utf8',
                    deliveryMode: undefined,
                    priority: undefined,
                    correlationId: undefined,
                    replyTo: undefined,
                    expiration: undefined,
                    messageId: undefined,
                    timestamp: undefined,
                    type: undefined,
                    userId: undefined,
                    appId: undefined,
                    clusterId: undefined,
                });

                publishChannel.cancel('sailor_nodejs');

                done();
            },
            {
                consumerTag: 'sailor_nodejs'
            });

        run = requireRun();
    });
});

function requireRun() {
    const path = '../run.js';
    var resolved = require.resolve(path);
    delete require.cache[resolved];
    return require(path);
}
