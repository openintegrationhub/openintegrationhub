'use strict';

const nock = require('nock');
const expect = require('chai').expect;
const uuid = require('uuid');
const sinonjs = require('sinon');
const logging = require('../lib/logging.js');
const helpers = require('./integration_helpers');
const encryptor = require('../lib/encryptor');
const settings = require('../lib/settings');

const env = process.env;
function requireRun() {
    //@todo it would be great to use something like this https://github.com/jveski/shelltest
    const path = '../runGlobal.js';
    const resolved = require.resolve(path);
    delete require.cache[resolved];
    return require(path);
}
describe('Integration Test for globalRun', () => {
    const customers = [
        {
            name: 'Homer Simpson'
        },
        {
            name: 'Marge Simpson'
        }
    ];
    let inputMessage;
    let runner;

    beforeEach(() => {
        inputMessage = {
            headers: {
                stepId: 'step_1'
                // 'x-eio-routing-key': 'tenant.12345'
            },
            body: {
                message: 'Just do it!'
            }
        };
        helpers.prepareEnv();
        env.ELASTICIO_FUNCTION = 'init_trigger';

        nock(`https://localhost:2345/snapshots/flows/5559edd38968ec0736000003/steps`)
            .get(`/step_1`)
            .reply(200,{ data: { snapshot: 'blubb' } });
    });

    afterEach(async () => {
        delete env.ELASTICIO_STARTUP_REQUIRED;
        delete env.ELASTICIO_FUNCTION;
        delete env.ELASTICIO_HOOK_SHUTDOWN;

        await runner._disconnectOnly();
        nock.cleanAll();
    });

    let sinon;
    beforeEach(() => {
        sinon = sinonjs.createSandbox();
    });
    afterEach(() => {
        sinon.restore();
    });

    describe('when ferryman is being invoked for message processing', () => {
        let parentMessageId;
        let threadId;
        let messageId;

        let amqpHelper = helpers.amqpGlobal();
        beforeEach(async () => {
            await amqpHelper.prepare();
            threadId = uuid.v4();
            parentMessageId = uuid.v4();
            messageId = uuid.v4();
        });
        afterEach(() => amqpHelper.cleanUp());

        for (let protocolVersion of [1,2]) {
            describe(`for output protocolVersion ${protocolVersion}`, () => {

                let encoding;
                beforeEach(() => {
                    env.ELASTICIO_PROTOCOL_VERSION = protocolVersion;
                    encoding = protocolVersion < 2 ? 'base64' : undefined;
                });

                it('should run trigger successfully for input protocolVersion 1', async () => {
                    helpers.mockApiTaskStepResponse();

                    nock('https://api.acme.com')
                        .post('/subscribe')
                        .reply(200, {
                            id: 'subscription_12345'
                        })
                        .get('/customers')
                        .reply(200, customers);

                    runner = requireRun();

                    await amqpHelper.publishMessage(inputMessage,
                        {
                            parentMessageId,
                            threadId
                        },
                        {},
                        true
                    );

                    const [{ message, queueName }] = await Promise.all([
                        new Promise(resolve => amqpHelper.on(
                            'data',
                            (message, queueName) => resolve({ message, queueName })
                        )),
                        runner.run(settings.readFrom(process.env))
                    ]);

                    const { properties, content } = message;
                    const { body } = encryptor.decryptMessageContent(content, encoding);
                    expect(queueName).to.eql(amqpHelper.nextStepQueue);

                    expect(properties.headers.messageId).to.be.a('string');
                    delete properties.headers.start;
                    delete properties.headers.end;
                    delete properties.headers.cid;
                    delete properties.headers.messageId;

                    expect(properties.headers).to.deep.equal({
                        'execId': env.ELASTICIO_EXEC_ID,
                        'taskId': env.ELASTICIO_FLOW_ID,
                        'workspaceId': env.ELASTICIO_WORKSPACE_ID,
                        'containerId': env.ELASTICIO_CONTAINER_ID,
                        'userId': env.ELASTICIO_USER_ID,
                        'stepId': env.ELASTICIO_STEP_ID,
                        'compId': env.ELASTICIO_COMP_ID,
                        'function': env.ELASTICIO_FUNCTION,
                        threadId,
                        parentMessageId,
                        'protocolVersion': protocolVersion,
                        'x-eio-routing-key': env.ELASTICIO_DATA_ROUTING_KEY
                    });

                    delete properties.headers;

                    expect(properties).to.deep.equal({
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
                        clusterId: undefined
                    });

                    expect(body).to.deep.equal({
                        originalMsg: inputMessage,
                        customers: customers,
                        subscription: {
                            id: 'subscription_12345',
                            cfg: {
                                apiKey: 'secret'
                            }
                        }
                    });
                });


                it('should run trigger successfully for input protocolVersion 2', async () => {
                    helpers.mockApiTaskStepResponse();

                    nock('https://api.acme.com')
                        .post('/subscribe')
                        .reply(200, {
                            id: 'subscription_12345'
                        })
                        .get('/customers')
                        .reply(200, customers);

                    await amqpHelper.publishMessage(
                        inputMessage,
                        {
                            parentMessageId,
                            threadId
                        },
                        {
                            protocolVersion: 2
                        },
                        true
                    );

                    runner = requireRun();

                    const [{ message, queueName }] = await Promise.all([
                        new Promise(resolve => amqpHelper.on(
                            'data',
                            (message, queueName) => resolve({ message, queueName })
                        )),
                        runner.run(settings.readFrom(process.env))
                    ]);

                    const { properties, content } = message;
                    const { body } = encryptor.decryptMessageContent(content, encoding);
                    expect(queueName).to.eql(amqpHelper.nextStepQueue);

                    expect(properties.headers.messageId).to.be.a('string');
                    delete properties.headers.start;
                    delete properties.headers.end;
                    delete properties.headers.cid;
                    delete properties.headers.messageId;

                    expect(properties.headers).to.deep.equal({
                        'execId': env.ELASTICIO_EXEC_ID,
                        'taskId': env.ELASTICIO_FLOW_ID,
                        'workspaceId': env.ELASTICIO_WORKSPACE_ID,
                        'containerId': env.ELASTICIO_CONTAINER_ID,
                        'userId': env.ELASTICIO_USER_ID,
                        'stepId': env.ELASTICIO_STEP_ID,
                        'compId': env.ELASTICIO_COMP_ID,
                        'function': env.ELASTICIO_FUNCTION,
                        threadId,
                        parentMessageId,
                        'protocolVersion': protocolVersion,
                        'x-eio-routing-key': env.ELASTICIO_DATA_ROUTING_KEY
                    });

                    delete properties.headers;

                    expect(properties).to.deep.equal({
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
                        clusterId: undefined
                    });

                    expect(body).to.deep.equal({
                        originalMsg: inputMessage,
                        customers: customers,
                        subscription: {
                            id: 'subscription_12345',
                            cfg: {
                                apiKey: 'secret'
                            }
                        }
                    });
                });

                // it('should augment passthrough property with data', async () => {
                //     process.env.ELASTICIO_STEP_ID = 'step_2';
                //     process.env.ELASTICIO_FLOW_ID = '5559edd38968ec0736000003';
                //     process.env.ELASTICIO_FUNCTION = 'emit_data';
                //
                //     helpers.mockApiTaskStepResponse({
                //         is_passthrough: true
                //     });
                //
                //     const psMsg = {
                //         id: messageId,
                //         headers: {
                //             'x-custom-component-header': '123_abc'
                //             // 'stepId': env.ELASTICIO_STEP_ID
                //             // 'x-eio-routing-key': 'tenant.12345'
                //
                //         },
                //         body: {
                //             message: 'Just do it'
                //         },
                //         passthrough: {
                //             step_1: { // emulating an another step – just to be sure that it's not lost
                //                 id: '34',
                //                 body: {},
                //                 attachments: {}
                //             }
                //         }
                //     };
                //
                //     await amqpHelper.publishMessage(psMsg, {
                //         parentMessageId,
                //         threadId
                //     },{}, true);
                //
                //     runner = requireRun();
                //
                //     const [{ message, queueName }] = await Promise.all([
                //         new Promise(resolve => amqpHelper.on(
                //             'data',
                //             (message, queueName) => resolve({ message, queueName })
                //         )),
                //         runner.run(settings.readFrom(process.env))
                //     ]);
                //
                //     const { properties, content } = message;
                //     const { passthrough } = encryptor.decryptMessageContent(content, encoding);
                //     expect(queueName).to.eql(amqpHelper.nextStepQueue);
                //
                //     expect(properties.headers.messageId).to.be.a('string');
                //     delete properties.headers.start;
                //     delete properties.headers.end;
                //     delete properties.headers.cid;
                //     delete properties.headers.messageId;
                //
                //     expect(properties.headers).to.deep.equal({
                //         'taskId': env.ELASTICIO_FLOW_ID,
                //         'execId': env.ELASTICIO_EXEC_ID,
                //         'workspaceId': env.ELASTICIO_WORKSPACE_ID,
                //         'containerId': env.ELASTICIO_CONTAINER_ID,
                //         'userId': env.ELASTICIO_USER_ID,
                //         threadId,
                //         // 'stepId': env.ELASTICIO_STEP_ID,
                //         'compId': env.ELASTICIO_COMP_ID,
                //         'function': env.ELASTICIO_FUNCTION,
                //         parentMessageId,
                //         'protocolVersion': protocolVersion,
                //         'x-eio-routing-key': env.ELASTICIO_DATA_ROUTING_KEY
                //     });
                //
                //     expect(passthrough.step_1).to.deep.eql(psMsg.passthrough.step_1);
                //
                //     expect(passthrough.step_2.headers).to.deep.eql(psMsg.headers);
                //     expect(passthrough.step_2.body).to.deep.eql({
                //         hai: 'there',
                //         id: 'someId'
                //     });
                //
                //     delete properties.headers;
                //
                //     expect(properties).to.deep.eql({
                //         contentType: 'application/json',
                //         contentEncoding: 'utf8',
                //         deliveryMode: undefined,
                //         priority: undefined,
                //         correlationId: undefined,
                //         replyTo: undefined,
                //         expiration: undefined,
                //         messageId: undefined,
                //         timestamp: undefined,
                //         type: undefined,
                //         userId: undefined,
                //         appId: undefined,
                //         clusterId: undefined
                //     });
                // });

                // it(
                //     'should paste data from incoming message into passthrough '
                //     + 'and not copy own data if NO_SELF_PASSTRHOUGH',
                //     async () => {
                //         process.env.ELASTICIO_STEP_ID = 'step_2';
                //         process.env.ELASTICIO_FLOW_ID = '5559edd38968ec0736000003';
                //         process.env.ELASTICIO_FUNCTION = 'emit_data';
                //         const ferrymanSettings = settings.readFrom(process.env);
                //         ferrymanSettings.NO_SELF_PASSTRHOUGH = true;
                //
                //         helpers.mockApiTaskStepResponse({
                //             is_passthrough: true
                //         });
                //
                //         const psMsg = {
                //             headers: {
                //                 stepId: 'step_2'
                //             },
                //             body: {
                //                 message: 'Just do it!'
                //             },
                //             passthrough: {
                //                 step_oth: { // emulating an another step – just to be sure that it's not lost
                //                     id: 'id-56',
                //                     body: { a: 1 },
                //                     attachments: {}
                //                 }
                //             }
                //         };
                //
                //         await amqpHelper.publishMessage(psMsg, {
                //             parentMessageId,
                //             threadId
                //         },{}, true);
                //
                //         runner = requireRun();
                //
                //         const [{ message, queueName }] = await Promise.all([
                //             new Promise(resolve => amqpHelper.on(
                //                 'data',
                //                 (message, queueName) => resolve({ message, queueName })
                //             )),
                //             runner.run(ferrymanSettings)
                //         ]);
                //
                //         const { properties, content } = message;
                //         const { passthrough } = encryptor.decryptMessageContent(content, encoding);
                //         expect(queueName).to.eql(amqpHelper.nextStepQueue);
                //
                //         const localHeaders = inputMessage.headers;
                //         localHeaders.stepId = 'step_2';
                //
                //         expect(passthrough).to.deep.eql({
                //             step_oth: {
                //                 id: 'id-56',
                //                 body: { a: 1 },
                //                 attachments: {}
                //             },
                //             step_2: {
                //                 headers: localHeaders ,
                //                 body: inputMessage.body
                //             }
                //         });
                //
                //         expect(properties.headers.messageId).to.be.a('string');
                //         delete properties.headers.start;
                //         delete properties.headers.end;
                //         delete properties.headers.cid;
                //         delete properties.headers.messageId;
                //
                //         expect(properties.headers).to.deep.equal({
                //             'taskId': env.ELASTICIO_FLOW_ID,
                //             'execId': env.ELASTICIO_EXEC_ID,
                //             'workspaceId': env.ELASTICIO_WORKSPACE_ID,
                //             'containerId': env.ELASTICIO_CONTAINER_ID,
                //             'userId': env.ELASTICIO_USER_ID,
                //             threadId,
                //             'stepId': env.ELASTICIO_STEP_ID,
                //             'compId': env.ELASTICIO_COMP_ID,
                //             'function': env.ELASTICIO_FUNCTION,
                //             parentMessageId,
                //             'protocolVersion': protocolVersion,
                //             'x-eio-routing-key': env.ELASTICIO_DATA_ROUTING_KEY
                //         });
                //
                //         delete properties.headers;
                //
                //         expect(properties).to.deep.eql({
                //             contentType: 'application/json',
                //             contentEncoding: 'utf8',
                //             deliveryMode: undefined,
                //             priority: undefined,
                //             correlationId: undefined,
                //             replyTo: undefined,
                //             expiration: undefined,
                //             messageId: undefined,
                //             timestamp: undefined,
                //             type: undefined,
                //             userId: undefined,
                //             appId: undefined,
                //             clusterId: undefined
                //         });
                //     }
                // );

                // it('should work well with async process function emitting data', async () => {
                //     process.env.ELASTICIO_STEP_ID = 'step_2';
                //     process.env.ELASTICIO_FLOW_ID = '5559edd38968ec0736000003';
                //     process.env.ELASTICIO_FUNCTION = 'async_trigger';
                //     process.env.ELASTICIO_DATA_RATE_LIMIT = '1';
                //     process.env.ELASTICIO_RATE_INTERVAL = '110';
                //
                //     helpers.mockApiTaskStepResponse({
                //         is_passthrough: true
                //     });
                //
                //     const psMsg = Object.assign(inputMessage, {
                //         passthrough: {
                //             step_oth: { // emulating an another step – just to be sure that it's not lost
                //                 id: 'm-34',
                //                 body: {},
                //                 attachments: {}
                //             }
                //         },
                //         headers: {
                //             'x-custom-component-header': '123_abc',
                //             'stepId': 'step_2',
                //             'x-eio-routing-key': 'tenant.12345'
                //         }
                //     });
                //
                //     await amqpHelper.publishMessage(psMsg, {
                //         parentMessageId,
                //         threadId
                //     });
                //
                //     runner = requireRun();
                //
                //     const [{ message, queueName }] = await Promise.all([
                //         new Promise(resolve => amqpHelper.on(
                //             'data',
                //             (message, queueName) => resolve({ message, queueName })
                //         )),
                //         runner.run(settings.readFrom(process.env))
                //     ]);
                //
                //     const { properties, content } = message;
                //     const { passthrough } = encryptor.decryptMessageContent(content, encoding);
                //
                //     expect(queueName).to.eql(amqpHelper.nextStepQueue);
                //
                //     expect(passthrough.step_oth).to.deep.eql({
                //         id: 'm-34',
                //         body: {},
                //         attachments: {}
                //     });
                //
                //     expect(passthrough.step_2.headers).to.deep.eql({
                //         'x-custom-component-header': '123_abc'
                //         // 'stepId': 'step_2'
                //         // 'x-eio-routing-key': 'tenant.12345'
                //     });
                //     expect(passthrough.step_2.body).to.deep.eql({
                //         hai: 'there',
                //         id: 'someId'
                //     });
                //
                //     expect(properties.headers.messageId).to.be.a('string');
                //
                //     delete properties.headers.start;
                //     delete properties.headers.end;
                //     delete properties.headers.cid;
                //     delete properties.headers.messageId;
                //
                //     expect(properties.headers).to.deep.equal({
                //         'taskId': env.ELASTICIO_FLOW_ID,
                //         'execId': env.ELASTICIO_EXEC_ID,
                //         'workspaceId': env.ELASTICIO_WORKSPACE_ID,
                //         'containerId': env.ELASTICIO_CONTAINER_ID,
                //         'userId': env.ELASTICIO_USER_ID,
                //         threadId,
                //         'stepId': env.ELASTICIO_STEP_ID,
                //         'compId': env.ELASTICIO_COMP_ID,
                //         'function': env.ELASTICIO_FUNCTION,
                //         parentMessageId,
                //         protocolVersion,
                //         'x-eio-routing-key': env.ELASTICIO_DATA_ROUTING_KEY
                //     });
                //
                //     delete properties.headers;
                //
                //     expect(properties).to.deep.eql({
                //         contentType: 'application/json',
                //         contentEncoding: 'utf8',
                //         deliveryMode: undefined,
                //         priority: undefined,
                //         correlationId: undefined,
                //         replyTo: undefined,
                //         expiration: undefined,
                //         messageId: undefined,
                //         timestamp: undefined,
                //         type: undefined,
                //         userId: undefined,
                //         appId: undefined,
                //         clusterId: undefined
                //     });
                // });

                describe('when env ELASTICIO_STARTUP_REQUIRED is set', () => {
                    let ferrymanSettings;
                    beforeEach(() => {
                        ferrymanSettings = settings.readFrom(process.env);
                        ferrymanSettings.STARTUP_REQUIRED = '1';
                    });

                    describe('when hooks data for the task is not created yet', () => {
                        it('should execute startup successfully', async () => {
                            let startupRegistrationRequest;
                            const startupRegistrationNock = nock('http://example.com/')
                                .post('/subscriptions/enable')
                                .reply(200, (uri, requestBody) => {
                                    startupRegistrationRequest = requestBody;
                                    return {
                                        status: 'ok'
                                    };
                                });

                            helpers.mockApiTaskStepResponse();

                            // ferryman persists startup data via ferryman-support API
                            let hooksDataRequest;
                            const hooksDataNock = nock(env.ELASTICIO_API_URI)
                                .matchHeader('Connection', 'Keep-Alive')
                                .post('/sailor-support/hooks/task/5559edd38968ec0736000003/startup/data', {
                                    subscriptionResult: {
                                        status: 'ok'
                                    }
                                })
                                .reply(201, (uri, requestBody) => {
                                    hooksDataRequest = requestBody;
                                    return requestBody;
                                });

                            // response for a subscription request, which performed inside of init method
                            nock('https://api.acme.com')
                                .post('/subscribe')
                                .reply(200, {
                                    id: 'subscription_12345'
                                })
                                .get('/customers')
                                .reply(200, customers);

                            runner = requireRun();

                            await amqpHelper.publishMessage(inputMessage, { threadId });

                            const [{ message, queueName }] = await Promise.all([
                                new Promise(resolve => amqpHelper.on(
                                    'data',
                                    (message, queueName) => resolve({ message, queueName })
                                )),
                                runner.run(ferrymanSettings)
                            ]);

                            const { properties, content } = message;
                            const { body } = encryptor.decryptMessageContent(content, encoding);
                            expect(queueName).to.eql(amqpHelper.nextStepQueue);

                            expect(startupRegistrationRequest).to.deep.equal({
                                data: 'startup'
                            });

                            expect(hooksDataRequest).to.deep.equal({
                                subscriptionResult: {
                                    status: 'ok'
                                }
                            });

                            expect(startupRegistrationNock.isDone()).to.be.ok;
                            expect(hooksDataNock.isDone()).to.be.ok;

                            expect(properties.headers.messageId).to.be.a('string');

                            delete properties.headers.start;
                            delete properties.headers.end;
                            delete properties.headers.cid;
                            delete properties.headers.messageId;

                            expect(properties.headers).to.eql({
                                'execId': env.ELASTICIO_EXEC_ID,
                                'taskId': env.ELASTICIO_FLOW_ID,
                                'workspaceId': env.ELASTICIO_WORKSPACE_ID,
                                'containerId': env.ELASTICIO_CONTAINER_ID,
                                'userId': env.ELASTICIO_USER_ID,
                                'stepId': env.ELASTICIO_STEP_ID,
                                'compId': env.ELASTICIO_COMP_ID,
                                'function': env.ELASTICIO_FUNCTION,
                                protocolVersion,
                                threadId,
                                'x-eio-routing-key': env.ELASTICIO_DATA_ROUTING_KEY
                            });

                            expect(body).to.deep.equal({
                                originalMsg: inputMessage,
                                customers: customers,
                                subscription: {
                                    id: 'subscription_12345',
                                    cfg: {
                                        apiKey: 'secret'
                                    }
                                }
                            });
                        });
                    });

                    describe('when hooks data already exists', () => {
                        it('should delete previous data and execute startup successfully', async () => {
                            let startupRegistrationRequest;
                            const startupRegistrationNock = nock('http://example.com/')
                                .post('/subscriptions/enable')
                                .reply(200, (uri, requestBody) => {
                                    startupRegistrationRequest = requestBody;
                                    return {
                                        status: 'ok'
                                    };
                                });

                            helpers.mockApiTaskStepResponse();

                            let hooksDataRequest1;
                            let hooksDataRequest2;

                            // ferryman persists startup data via ferryman-support API
                            const hooksDataNock1 = nock(env.ELASTICIO_API_URI)
                                .matchHeader('Connection', 'Keep-Alive')
                                .post('/sailor-support/hooks/task/5559edd38968ec0736000003/startup/data', {
                                    subscriptionResult: {
                                        status: 'ok'
                                    }
                                })
                                .reply(409, (uri, requestBody) => {
                                    hooksDataRequest1 = requestBody;
                                    return {
                                        error: 'Hooks data for the task already exist. Delete previous data first.',
                                        status: 409,
                                        title: 'ConflictError'
                                    };
                                });

                            // ferryman removes data in order to resolve conflict
                            const hooksDataDeleteNock = nock(env.ELASTICIO_API_URI)
                                .matchHeader('Connection', 'Keep-Alive')
                                .delete('/sailor-support/hooks/task/5559edd38968ec0736000003/startup/data')
                                .reply(204);

                            // ferryman persists startup data via ferryman-support API
                            const hooksDataNock2 = nock(env.ELASTICIO_API_URI)
                                .matchHeader('Connection', 'Keep-Alive')
                                .post('/sailor-support/hooks/task/5559edd38968ec0736000003/startup/data', {
                                    subscriptionResult: {
                                        status: 'ok'
                                    }
                                })
                                .reply(201, (uri, requestBody) => {
                                    hooksDataRequest2 = requestBody;
                                    return requestBody;
                                });

                            // response for a subscription request, which performed inside of init method
                            nock('https://api.acme.com')
                                .post('/subscribe')
                                .reply(200, {
                                    id: 'subscription_12345'
                                })
                                .get('/customers')
                                .reply(200, customers);

                            runner = requireRun();

                            await amqpHelper.publishMessage(inputMessage, { threadId });

                            const [{ message, queueName }] = await Promise.all([
                                new Promise(resolve => amqpHelper.on(
                                    'data',
                                    (message, queueName) => resolve({ message, queueName })
                                )),
                                runner.run(ferrymanSettings)
                            ]);

                            const { properties, content } = message;
                            const { body } = encryptor.decryptMessageContent(content, encoding);
                            expect(queueName).to.eql(amqpHelper.nextStepQueue);

                            expect(startupRegistrationRequest).to.deep.equal({
                                data: 'startup'
                            });

                            expect(startupRegistrationNock.isDone()).to.be.ok;
                            expect(hooksDataNock1.isDone()).to.be.ok;
                            expect(hooksDataNock2.isDone()).to.be.ok;
                            expect(hooksDataDeleteNock.isDone()).to.be.ok;

                            expect(hooksDataRequest1).to.deep.equal({
                                subscriptionResult: {
                                    status: 'ok'
                                }
                            });

                            expect(hooksDataRequest2).to.deep.equal({
                                subscriptionResult: {
                                    status: 'ok'
                                }
                            });

                            expect(properties.headers.messageId).to.be.a('string');

                            delete properties.headers.start;
                            delete properties.headers.end;
                            delete properties.headers.cid;
                            delete properties.headers.messageId;

                            expect(properties.headers).to.eql({
                                'execId': env.ELASTICIO_EXEC_ID,
                                'taskId': env.ELASTICIO_FLOW_ID,
                                'workspaceId': env.ELASTICIO_WORKSPACE_ID,
                                'containerId': env.ELASTICIO_CONTAINER_ID,
                                'userId': env.ELASTICIO_USER_ID,
                                'stepId': env.ELASTICIO_STEP_ID,
                                'compId': env.ELASTICIO_COMP_ID,
                                'function': env.ELASTICIO_FUNCTION,
                                'protocolVersion': protocolVersion,
                                threadId,
                                'x-eio-routing-key': env.ELASTICIO_DATA_ROUTING_KEY
                            });

                            expect(body).to.deep.equal({
                                originalMsg: inputMessage,
                                customers: customers,
                                subscription: {
                                    id: 'subscription_12345',
                                    cfg: {
                                        apiKey: 'secret'
                                    }
                                }
                            });
                        });
                    });

                    describe('when startup method returns empty data', () => {
                        it('should store an empty object as data and execute trigger successfully', async () => {
                            let startupRegistrationRequest;

                            ferrymanSettings.FUNCTION = 'startup_with_empty_data';

                            const startupRegistrationNock = nock('http://example.com/')
                                .post('/subscriptions/enable')
                                .reply(200, (uri, requestBody) => {
                                    startupRegistrationRequest = requestBody;
                                    return {
                                        status: 'ok'
                                    };
                                });

                            helpers.mockApiTaskStepResponse();

                            // ferryman persists startup data via ferryman-support API
                            const hooksDataNock = nock(env.ELASTICIO_API_URI)
                                .matchHeader('Connection', 'Keep-Alive')
                                .post('/sailor-support/hooks/task/5559edd38968ec0736000003/startup/data', {})
                                .reply(201);

                            // ferryman removes data in order to resolve conflict
                            const hooksDataDeleteNock = nock(env.ELASTICIO_API_URI)
                                .matchHeader('Connection', 'Keep-Alive')
                                .delete('/sailor-support/hooks/task/5559edd38968ec0736000003/startup/data')
                                .reply(400);

                            // response for a subscription request, which performed inside of init method
                            nock('https://api.acme.com')
                                .post('/subscribe')
                                .reply(200, {
                                    id: 'subscription_12345'
                                })
                                .get('/customers')
                                .reply(200, customers);

                            runner = requireRun();

                            await amqpHelper.publishMessage(inputMessage, { threadId });

                            const [{ message, queueName }] = await Promise.all([
                                new Promise(resolve => amqpHelper.on(
                                    'data',
                                    (message, queueName) => resolve({ message, queueName })
                                )),
                                runner.run(ferrymanSettings)
                            ]);

                            const { properties, content } = message;
                            const { body } = encryptor.decryptMessageContent(content, encoding);
                            expect(queueName).to.eql(amqpHelper.nextStepQueue);

                            expect(startupRegistrationRequest).to.deep.equal({
                                data: 'startup'
                            });

                            expect(startupRegistrationNock.isDone()).to.be.ok;
                            expect(hooksDataNock.isDone()).to.be.ok;
                            expect(hooksDataDeleteNock.isDone()).to.not.be.ok;

                            expect(properties.headers.messageId).to.be.a('string');

                            delete properties.headers.start;
                            delete properties.headers.end;
                            delete properties.headers.cid;
                            delete properties.headers.messageId;

                            expect(properties.headers).to.eql({
                                'execId': env.ELASTICIO_EXEC_ID,
                                'taskId': env.ELASTICIO_FLOW_ID,
                                'workspaceId': env.ELASTICIO_WORKSPACE_ID,
                                'containerId': env.ELASTICIO_CONTAINER_ID,
                                'userId': env.ELASTICIO_USER_ID,
                                'stepId': env.ELASTICIO_STEP_ID,
                                'compId': env.ELASTICIO_COMP_ID,
                                'function': ferrymanSettings.FUNCTION,
                                'protocolVersion': protocolVersion,
                                threadId,
                                'x-eio-routing-key': env.ELASTICIO_DATA_ROUTING_KEY
                            });

                            expect(body).to.deep.equal({
                                originalMsg: inputMessage,
                                customers: customers,
                                subscription: {
                                    id: 'subscription_12345',
                                    cfg: {
                                        apiKey: 'secret'
                                    }
                                }
                            });
                        });
                    });

                    describe('when startup method does not exist', () => {
                        it('should store an empty hooks data and run trigger successfully', async () => {
                            ferrymanSettings.FUNCTION = 'trigger_with_no_hooks';

                            helpers.mockApiTaskStepResponse();

                            // ferryman persists startup data via ferryman-support API
                            const hooksDataNock = nock(env.ELASTICIO_API_URI)
                                .matchHeader('Connection', 'Keep-Alive')
                                .post('/sailor-support/hooks/task/5559edd38968ec0736000003/startup/data', {})
                                .reply(201);

                            // response for a subscription request, which performed inside of init method
                            nock('https://api.acme.com')
                                .get('/customers')
                                .reply(200, customers);

                            runner = requireRun();

                            await amqpHelper.publishMessage(inputMessage, { threadId });

                            const [{ message, queueName }] = await Promise.all([
                                new Promise(resolve => amqpHelper.on(
                                    'data',
                                    (message, queueName) => resolve({ message, queueName })
                                )),
                                runner.run(ferrymanSettings)
                            ]);

                            const { properties, content } = message;
                            const { body } = encryptor.decryptMessageContent(content, encoding);
                            expect(queueName).to.eql(amqpHelper.nextStepQueue);

                            expect(properties.headers.messageId).to.be.a('string');

                            delete properties.headers.start;
                            delete properties.headers.end;
                            delete properties.headers.cid;
                            delete properties.headers.messageId;

                            expect(properties.headers).to.eql({
                                'execId': env.ELASTICIO_EXEC_ID,
                                'taskId': env.ELASTICIO_FLOW_ID,
                                'workspaceId': env.ELASTICIO_WORKSPACE_ID,
                                'containerId': env.ELASTICIO_CONTAINER_ID,
                                'userId': env.ELASTICIO_USER_ID,
                                'stepId': env.ELASTICIO_STEP_ID,
                                'compId': env.ELASTICIO_COMP_ID,
                                'function': ferrymanSettings.FUNCTION,
                                'protocolVersion': protocolVersion,
                                threadId,
                                'x-eio-routing-key': env.ELASTICIO_DATA_ROUTING_KEY
                            });

                            expect(body).to.deep.equal({
                                originalMsg: inputMessage,
                                customers: customers
                            });

                            expect(hooksDataNock.isDone()).to.be.ok;
                        });
                    });
                });

                describe('when env ELASTICIO_ADDITIONAL_VARS_FOR_HEADERS is set', () => {

                    beforeEach(() => {
                        env.ELASTICIO_ADDITIONAL_VARS_FOR_HEADERS = 'ELASTICIO_FIRST, ELASTICIO_SECOND_ELASTICIO_ENV ,'
                            + 'ELASTICIO_NOT_PRESENT';

                        env.ELASTICIO_RANDOM = 'random';
                        env.ELASTICIO_FIRST = 'first';
                        env.ELASTICIO_SECOND_ELASTICIO_ENV = 'second';
                    });

                    afterEach(() => {
                        delete env.ELASTICIO_ADDITIONAL_VARS_FOR_HEADERS;
                        delete env.ELASTICIO_RANDOM;
                        delete env.FIRST;
                        delete env.ELASTICIO_SECOND_ELASTICIO_ENV;
                    });

                    it('should run trigger successfully and pass additional vars to headers', async () => {


                        helpers.mockApiTaskStepResponse();

                        nock('https://api.acme.com')
                            .post('/subscribe')
                            .reply(200, {
                                id: 'subscription_12345'
                            })
                            .get('/customers')
                            .reply(200, customers);

                        runner = requireRun();

                        await amqpHelper.publishMessage(inputMessage, {
                            parentMessageId,
                            threadId
                        });

                        const [{ message, queueName }] = await Promise.all([
                            new Promise(resolve => amqpHelper.on(
                                'data',
                                (message, queueName) => resolve({ message, queueName })
                            )),
                            runner.run(settings.readFrom(process.env))
                        ]);


                        const { properties, content } = message;
                        const { body } = encryptor.decryptMessageContent(content, encoding);
                        expect(queueName).to.eql(amqpHelper.nextStepQueue);

                        expect(properties.headers.messageId).to.be.a('string');

                        delete properties.headers.start;
                        delete properties.headers.end;
                        delete properties.headers.cid;
                        delete properties.headers.messageId;

                        expect(properties.headers).to.deep.equal({
                            'first': 'first',
                            'secondElasticioEnv': 'second',
                            'execId': env.ELASTICIO_EXEC_ID,
                            'taskId': env.ELASTICIO_FLOW_ID,
                            'workspaceId': env.ELASTICIO_WORKSPACE_ID,
                            'containerId': env.ELASTICIO_CONTAINER_ID,
                            'userId': env.ELASTICIO_USER_ID,
                            'stepId': env.ELASTICIO_STEP_ID,
                            'compId': env.ELASTICIO_COMP_ID,
                            'function': env.ELASTICIO_FUNCTION,
                            threadId,
                            parentMessageId,
                            protocolVersion,
                            'x-eio-routing-key': env.ELASTICIO_DATA_ROUTING_KEY
                        });

                        expect(body).to.deep.equal({
                            originalMsg: inputMessage,
                            customers: customers,
                            subscription: {
                                id: 'subscription_12345',
                                cfg: {
                                    apiKey: 'secret'
                                }
                            }
                        });
                    });

                });

                describe('when reply_to header is set', () => {
                    it('should send http reply successfully', async () => {

                        env.ELASTICIO_FUNCTION = 'http_reply_action';

                        helpers.mockApiTaskStepResponse();

                        nock('https://api.acme.com')
                            .post('/subscribe')
                            .reply(200, {
                                id: 'subscription_12345'
                            })
                            .get('/customers')
                            .reply(200, customers);

                        await amqpHelper.publishMessage(inputMessage, {}, {
                            reply_to: amqpHelper.httpReplyQueueRoutingKey,
                            threadId
                        });

                        runner = requireRun();

                        const [{ message, queueName }] = await Promise.all([
                            new Promise(resolve => amqpHelper.on(
                                'data',
                                (message, queueName) => resolve({ message, queueName })
                            )),
                            runner.run(settings.readFrom(process.env))
                        ]);

                        const { properties, content } = message;
                        const emittedMessage = encryptor.decryptMessageContent(content, 'base64');
                        expect(queueName).to.eql(amqpHelper.httpReplyQueueName);

                        delete properties.headers.start;
                        delete properties.headers.end;
                        delete properties.headers.cid;

                        expect(properties.headers.messageId).to.be.a('string');
                        delete properties.headers.messageId;

                        expect(properties.headers).to.eql({
                            'execId': env.ELASTICIO_EXEC_ID,
                            'taskId': env.ELASTICIO_FLOW_ID,
                            'workspaceId': env.ELASTICIO_WORKSPACE_ID,
                            'containerId': env.ELASTICIO_CONTAINER_ID,
                            'userId': env.ELASTICIO_USER_ID,
                            'stepId': env.ELASTICIO_STEP_ID,
                            'compId': env.ELASTICIO_COMP_ID,
                            'function': env.ELASTICIO_FUNCTION,
                            'reply_to': amqpHelper.httpReplyQueueRoutingKey,
                            'protocolVersion': 1,
                            threadId,
                            'x-eio-routing-key': env.ELASTICIO_DATA_ROUTING_KEY
                        });

                        expect(emittedMessage).to.eql({
                            headers: {
                                'content-type': 'text/plain'
                            },
                            body: 'Ok',
                            statusCode: 200
                        });
                    });
                });

                describe('when ferryman could not init the module', () => {
                    it('should publish init errors to RabbitMQ', async () => {
                        // NOTICE, don't touch this.
                        // it produces side effect, disabling exit at error
                        // see lib/logging.js
                        sinon.stub(logging, 'criticalErrorAndExit');

                        env.ELASTICIO_FUNCTION = 'fails_to_init';

                        helpers.mockApiTaskStepResponse();

                        const ferrymanSettings = settings.readFrom(process.env);
                        ferrymanSettings.FUNCTION = 'fails_to_init';

                        runner = requireRun();

                        const [{ message, queueName }] = await Promise.all([
                            new Promise(resolve => amqpHelper.on(
                                'data',
                                (message, queueName) => resolve({ message, queueName })
                            )),
                            runner.run(ferrymanSettings)
                        ]);

                        const { properties, content } = message;
                        const emittedMessage = JSON.parse(content);
                        const error = encryptor.decryptMessageContent(emittedMessage.error, 'base64');
                        expect(queueName).to.eql(amqpHelper.nextStepErrorQueue);
                        expect(error.message).to.equal('OMG. I cannot init');
                        expect(properties.headers).to.deep.include({
                            execId: env.ELASTICIO_EXEC_ID,
                            taskId: env.ELASTICIO_FLOW_ID,
                            workspaceId: env.ELASTICIO_WORKSPACE_ID,
                            containerId: env.ELASTICIO_CONTAINER_ID,
                            userId: env.ELASTICIO_USER_ID,
                            stepId: env.ELASTICIO_STEP_ID,
                            compId: env.ELASTICIO_COMP_ID,
                            function: env.ELASTICIO_FUNCTION
                        });
                    });
                });
            });
        }

    });

    describe('when ferryman is being invoked for shutdown', () => {
        describe('when hooksdata is found', () => {
            it('should execute shutdown hook successfully', async () => {
                helpers.amqp().prepareEnv();
                const ferrymanSettings = settings.readFrom(process.env);
                ferrymanSettings.HOOK_SHUTDOWN = '1';

                const subsriptionResponse = {
                    subId: '507'
                };

                let requestFromShutdownHook;
                const requestFromShutdownNock = nock('http://example.com/')
                    .post('/subscriptions/disable')
                    .reply(200, (uri, requestBody) => {
                        requestFromShutdownHook = requestBody;
                        return {
                            status: 'ok'
                        };
                    });

                // ferryman retrieves startup data via ferryman-support API
                const hooksDataGetNock = nock(ferrymanSettings.API_URI)
                    .matchHeader('Connection', 'Keep-Alive')
                    .get('/sailor-support/hooks/task/5559edd38968ec0736000003/startup/data')
                    .reply(200, subsriptionResponse);

                // ferryman removes startup data via ferryman-support API
                const hooksDataDeleteNock = nock(ferrymanSettings.API_URI)
                    .matchHeader('Connection', 'Keep-Alive')
                    .delete('/sailor-support/hooks/task/5559edd38968ec0736000003/startup/data')
                    .reply(204);

                helpers.mockApiTaskStepResponse();

                runner = requireRun();

                await Promise.all([
                    runner.run(ferrymanSettings),
                    new Promise(resolve =>
                        // hooksDataDeleteNock.on('replied', () => setTimeout(() => resolve(), 50)))
                        hooksDataDeleteNock.on('replied', () => resolve()))
                ]);

                expect(hooksDataGetNock.isDone()).to.be.ok;

                expect(requestFromShutdownHook).to.deep.equal({
                    cfg: {
                        apiKey: 'secret'
                    },
                    startupData: subsriptionResponse
                });

                expect(requestFromShutdownNock.isDone()).to.be.ok;
                expect(hooksDataDeleteNock.isDone()).to.be.ok;
            });
        });

        // describe('when request for hooksdata is failed with an error', () => {
        //     // @todo
        //     it('should not execute shutdown hook');
        // });
        //
        // describe('when shutdown hook method is not found', () => {
        //     // @todo
        //     it('should not thrown error and just finish process');
        // });
    });
});
