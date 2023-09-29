/* eslint no-unused-expressions: 0 */ // --> OFF
/* eslint max-len: 0 */ // --> OFF

const chai = require('chai');
const sinon = require('sinon');

const jwt = require('jsonwebtoken');

const { expect } = chai;
chai.use(require('sinon-chai'));

const uuid = require('uuid');
const _ = require('lodash');

const nock = require('nock');
const { Ferryman } = require('../../lib/ferryman');
const Settings = require('../../lib/settings');
const amqp = require('../../lib/amqp.js');
const encryptor = require('../../lib/encryptor.js');

const flowId = '5559edd38968ec0736000003';
// const stepId = 'step_1';

function makeOrchestratorToken(action) {
    return jwt.sign({
        flowId: '5559edd38968ec0736000003',
        stepId: 'step_1',
        userId: '5559edd38968ec0736000002',
        function: action,
        apiKey: '123456',
        nodeSettings: { idLinking: true, appId: 'SomeApp' },
        apiUsername: 'someuser@openintegrationhub.com',
        snapshotRoutingKey: '559edd38968ec0736000003:step_1:1432205514864:snapshot'
    }, 'somesecret');
}

describe('Ferryman', () => {
    let settings;
    let sandbox;
    let envVars;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        envVars = {};
        envVars.ELASTICIO_AMQP_URI = 'amqp://test2/test2';
        envVars.ELASTICIO_AMQP_PUBLISH_RETRY_ATTEMPTS = 10;
        envVars.ELASTICIO_AMQP_PUBLISH_MAX_RETRY_DELAY = 60 * 1000;

        envVars.ELASTICIO_FLOW_ID = '5559edd38968ec0736000003';
        envVars.ELASTICIO_STEP_ID = 'step_1';
        envVars.ELASTICIO_EXEC_ID = 'some-exec-id';
        envVars.ELASTICIO_WORKSPACE_ID = '5559edd38968ec073600683';
        envVars.ELASTICIO_CONTAINER_ID = 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948';

        envVars.ELASTICIO_USER_ID = '5559edd38968ec0736000002';
        envVars.ELASTICIO_COMP_ID = '5559edd38968ec0736000456';
        envVars.ELASTICIO_FUNCTION = 'list';

        envVars.ELASTICIO_LISTEN_MESSAGES_ON = '5559edd38968ec0736000003:step_1:1432205514864:messages';
        envVars.ELASTICIO_PUBLISH_MESSAGES_TO = 'userexchange:5527f0ea43238e5d5f000001';

        envVars.ELASTICIO_BACKCHANNEL_EXCHANGE = 'backChannel:5527f0ea43238e5d5f000001';
        envVars.ELASTICIO_NODE_EXCHANGE = 'node:exchange';

        envVars.ELASTICIO_OUTPUT_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:output';
        envVars.ELASTICIO_GOVERNANCE_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:governance';

        envVars.ELASTICIO_ERROR_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:error';
        envVars.ELASTICIO_REBOUND_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:rebound';
        // envVars.ELASTICIO_SNAPSHOT_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:snapshot';

        envVars.ELASTICIO_COMPONENT_PATH = '/spec/component';
        envVars.ELASTICIO_DEBUG = 'Ferryman';

        envVars.ELASTICIO_API_URI = 'http://apihost.com';
        envVars.ELASTICIO_API_USERNAME = 'test@test.com';
        envVars.ELASTICIO_API_KEY = '5559edd';

        envVars.ELASTICIO_SNAPSHOTS_SERVICE_BASE_URL = 'https://localhost:2345';
        envVars.ELASTICIO_DATAHUB_BASE_URL = false; // 'http://localhost:1234';


        settings = Settings.readFrom(envVars);

        const stepId = 'step_1';

        nock(`https://localhost:2345/snapshots/flows/${flowId}/steps`)
            .get(`/${stepId}`)
            .reply(200, {
                data: {
                    snapshot: {
                        id: '123456789',
                        value: 'abc'
                    }
                }
            });
    });

    afterEach(() => {
        sandbox.restore();
        nock.cleanAll();
    });
    describe('readIncomingMessageHeaders', () => {
        let ferryman;
        beforeEach(() => {
            ferryman = new Ferryman(settings);
        });
        // it('should copy stepId header', () => {
        //   const stepId = 'step_1';
        //   const result = ferryman.readIncomingMessageHeaders({
        //     properties: {
        //       headers: {
        //         stepId,
        //       },
        //     },
        //   });
        //
        //   expect(result).to.include({ stepId });
        // });

        it('should copy messageId header', () => {
            const messageId = 'message_1234';
            const result = ferryman.readIncomingMessageHeaders({
                properties: {
                    headers: {
                        messageId
                    }
                }
            });

            expect(result).to.include({ messageId });
        });

        it('should copy parentMessageId', () => {
            const parentMessageId = 'parent_message_1234';

            const result = ferryman.readIncomingMessageHeaders({
                properties: {
                    headers: {
                        parentMessageId
                    }
                }
            });

            expect(result).to.include({ parentMessageId });
        });

        it('should reply_to', () => {
            const result = ferryman.readIncomingMessageHeaders({
                properties: {
                    headers: {
                        reply_to: 'my_reply_to_exchange'
                    }
                }
            });

            expect(result).to.include({
                reply_to: 'my_reply_to_exchange'
            });
        });

        it('it should copy and normalize names for x-eio headers', () => {
            const headers = {
                'x-eio-meta-lowercase': 'I am lowercase',
                'X-eio-meta-miXeDcAse': 'Eventually to become lowercase'
            };

            const result = ferryman.readIncomingMessageHeaders({
                properties: {
                    headers
                }
            });

            expect(result).to.include({
                'x-eio-meta-lowercase': 'I am lowercase',
                'x-eio-meta-mixedcase': 'Eventually to become lowercase'
            });
        });

        it('should copy threadId header', () => {
            const threadId = 'threadId';
            const result = ferryman.readIncomingMessageHeaders({
                properties: {
                    headers: {
                        threadId
                    }
                }
            });

            expect(result).to.include({
                threadId
            });
        });
        it('should fallback to x-eio-meta-trace-id', () => {
            const threadId = 'threadId';
            const result = ferryman.readIncomingMessageHeaders({
                properties: {
                    headers: {
                        'x-eio-meta-trace-id': threadId
                    }
                }
            });

            expect(result).to.include({
                threadId
            });
        });
    });
    describe('processMessage', () => {
        let fakeAMQPConnection;
        let message;
        let payload;

        beforeEach(() => {
            fakeAMQPConnection = {
                connect: sandbox.stub(),
                sendBackChannel: sandbox.stub(),
                sendGovernanceChannel: sandbox.stub(),
                sendError: sandbox.stub(),
                sendRebound: sandbox.stub(),
                sendFunctionComplete: sandbox.stub(),
                ack: sandbox.stub(),
                reject: sandbox.stub(),
                sendSnapshot: sandbox.stub(),
                sendHttpReply: sandbox.stub()
            };
            sandbox.stub(amqp, 'Amqp').returns(fakeAMQPConnection);

            const orchestratorToken = makeOrchestratorToken('init_trigger');

            payload = {
                param1: 'Value1'
                // headers: {
                //   orchestratorToken,
                // },
            };

            message = {
                fields: {
                    consumerTag: 'abcde',
                    deliveryTag: 12345,
                    exchange: 'test',
                    routingKey: 'test.hello'
                },
                properties: {
                    contentType: 'application/json',
                    contentEncoding: 'utf8',
                    headers: {
                        orchestratorToken,
                        taskId: '5559edd38968ec0736000003',
                        execId: 'some-exec-id',
                        userId: '5559edd38968ec0736000002',
                        workspaceId: '5559edd38968ec073600683',
                        threadId: uuid.v4(),
                        messageId: uuid.v4(),
                        parentMessageId: uuid.v4()
                        // stepId: 'step_1',
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
                    mandatory: true,
                    persistent: true,
                    clusterId: ''
                },
                content: Buffer.from(encryptor.encryptMessageContent(payload))
            };
        });

        it('should call sendBackChannel() and ack() if success', async () => {
            // settings.FUNCTION = 'data_trigger';
            const ferryman = new Ferryman(settings);

            const orchestratorToken = makeOrchestratorToken('data_trigger');

            message.properties.headers.orchestratorToken = orchestratorToken;

            await ferryman.connect();
            await ferryman.prepare();
            await ferryman.processMessage(payload, message);

            expect(fakeAMQPConnection.connect).to.have.been.calledOnce;

            expect(fakeAMQPConnection.sendBackChannel).to.have.been.calledOnce.and.calledWith(
                { items: [1, 2, 3, 4, 5, 6] },
                sinon.match({
                    'cid': 1,
                    'compId': '5559edd38968ec0736000456',
                    'containerId': 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948',
                    'end': sinon.match.number,
                    'execId': 'some-exec-id',
                    'function': 'data_trigger',
                    'messageId': sinon.match.string,
                    'parentMessageId': message.properties.headers.messageId,
                    'start': sinon.match.number,
                    'stepId': 'step_1',
                    'taskId': '5559edd38968ec0736000003',
                    'threadId': message.properties.headers.threadId,
                    'userId': '5559edd38968ec0736000002',
                    'workspaceId': '5559edd38968ec073600683',
                    'x-eio-routing-key': 'test.hello'
                })
            );

            expect(fakeAMQPConnection.ack).to.have.been.calledOnce.and.calledWith(message);
        });

        // it('should call sendBackChannel() with extended headers', async () => {
        //   const customVars = {
        //     ELASTICIO_ADDITIONAL_VARS_FOR_HEADERS: 'ELASTICIO_FIRST, ELASTICIO_SECOND_ELASTICIO_ENV,'
        //                 + 'ELASTICIO_NOT_PRESENT',
        //     ELASTICIO_RANDOM: 'random',
        //     ELASTICIO_FIRST: 'first',
        //     ELASTICIO_SECOND_ELASTICIO_ENV: 'second',
        //     ELASTICIO_THIRD: 'third',
        //   };
        //
        //   settings = Settings.readFrom(Object.assign({}, envVars, customVars));
        //   settings.FUNCTION = 'data_trigger';
        //   const ferryman = new Ferryman(settings);
        //
        //   await ferryman.connect();
        //   await ferryman.prepare();
        //   await ferryman.processMessage(payload, message);
        //
        //   expect(fakeAMQPConnection.connect).to.have.been.calledOnce;
        //   expect(fakeAMQPConnection.sendBackChannel).to.have.been.calledOnce.and.calledWith(
        //     { items: [1, 2, 3, 4, 5, 6] },
        //     sinon.match({
        //       first: 'first',
        //       secondElasticioEnv: 'second',
        //       notPresent: undefined,
        //       execId: 'some-exec-id',
        //       taskId: '5559edd38968ec0736000003',
        //       userId: '5559edd38968ec0736000002',
        //       workspaceId: '5559edd38968ec073600683',
        //       containerId: 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948',
        //       stepId: 'step_1',
        //       compId: '5559edd38968ec0736000456',
        //       function: 'data_trigger',
        //       start: sinon.match.number,
        //       cid: 1,
        //       end: sinon.match.number,
        //       messageId: sinon.match.string,
        //       'x-eio-routing-key': 'test.hello',
        //     }),
        //   );
        // });

        it('should call sendBackChannel() and ack() only once', async () => {
            // settings.FUNCTION = 'end_after_data_twice';
            const ferryman = new Ferryman(settings);

            const orchestratorToken = makeOrchestratorToken('end_after_data_twice');

            message.properties.headers.orchestratorToken = orchestratorToken;

            await ferryman.connect();
            await ferryman.prepare();
            await ferryman.processMessage(payload, message);

            expect(fakeAMQPConnection.connect).to.have.been.calledOnce;
            expect(fakeAMQPConnection.sendBackChannel).to.have.been.calledOnce;
            expect(fakeAMQPConnection.reject).not.to.have.been.called;
            expect(fakeAMQPConnection.ack).to.have.been.calledOnce;
        });

        // it('should augment emitted message with passthrough data', async () => {
        //     settings.FUNCTION = 'passthrough';
        //     const ferryman = new Ferryman(settings);
        //
        //     sandbox.stub(ferryman.apiClient.tasks, 'retrieveStep').callsFake((taskId, stepId) => {
        //         expect(taskId).to.deep.equal('5559edd38968ec0736000003');
        //         expect(stepId).to.deep.equal('step_1');
        //         return Promise.resolve({ is_passthrough: true });
        //     });
        //
        //     const psPayload = {
        //         body: payload,
        //         passthrough: {
        //             step_0: {
        //                 body: { key: 'value' }
        //             }
        //         }
        //     };
        //
        //     await ferryman.connect();
        //     await ferryman.prepare();
        //     await ferryman.processMessage(psPayload, message);
        //     expect(ferryman.apiClient.tasks.retrieveStep).to.have.callCount(1);
        //     expect(fakeAMQPConnection.connect).to.have.been.calledOnce;
        //     expect(fakeAMQPConnection.sendBackChannel).to.have.been.calledOnce.and.calledWith(
        //         {
        //             body: {
        //                 param1: 'Value1'
        //             },
        //             passthrough: {
        //                 step_0: {
        //                     body: {
        //                         key: 'value'
        //                     }
        //                 },
        //                 step_1: {
        //                     body: { param1: 'Value1' }
        //                 }
        //             }
        //         },
        //         sinon.match({
        //             'execId': 'some-exec-id',
        //             'taskId': '5559edd38968ec0736000003',
        //             'userId': '5559edd38968ec0736000002',
        //             'containerId': 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948',
        //             'workspaceId': '5559edd38968ec073600683',
        //             'stepId': 'step_1',
        //             'compId': '5559edd38968ec0736000456',
        //             'function': 'passthrough',
        //             'start': sinon.match.number,
        //             'cid': 1,
        //             'end': sinon.match.number,
        //             'messageId': sinon.match.string,
        //             'x-eio-routing-key': 'test.hello'
        //         })
        //     );
        //
        //     expect(fakeAMQPConnection.ack).to.have.been.calledOnce.and.calledWith(message);
        // });

        // it(
        //     'should augment emitted message with passthrough with data from incoming message '
        //     + 'if NO_SELF_PASSTRHOUGH set', async () => {
        //         message.properties.headers.stepId = 'step_1';
        //         settings.FUNCTION = 'passthrough';
        //         settings.NO_SELF_PASSTRHOUGH = true;
        //         const ferryman = new Ferryman(settings);
        //
        //         sandbox.stub(ferryman.apiClient.tasks, 'retrieveStep').callsFake((taskId, stepId) => {
        //             expect(taskId).to.deep.equal('5559edd38968ec0736000003');
        //             expect(stepId).to.deep.equal('step_1');
        //             return Promise.resolve({ is_passthrough: true });
        //         });
        //
        //         const psPayload = {
        //             body: payload,
        //             passthrough: {
        //                 step_oth: {
        //                     body: { key: 'value' }
        //                 }
        //             }
        //         };
        //
        //         await ferryman.connect();
        //         await ferryman.prepare();
        //         await ferryman.processMessage(psPayload, message);
        //         expect(ferryman.apiClient.tasks.retrieveStep).to.have.callCount(1);
        //         expect(fakeAMQPConnection.connect).to.have.been.calledOnce;
        //
        //         expect(fakeAMQPConnection.sendBackChannel).to.have.been.calledOnce.and.calledWith(
        //             {
        //                 body: {
        //                     param1: 'Value1'
        //                 },
        //                 passthrough: {
        //                     step_oth: {
        //                         body: {
        //                             key: 'value'
        //                         }
        //                     },
        //                     step_1: {
        //                         body: { param1: 'Value1' }
        //                     }
        //                 }
        //             },
        //             sinon.match({
        //                 'execId': 'some-exec-id',
        //                 'taskId': '5559edd38968ec0736000003',
        //                 'userId': '5559edd38968ec0736000002',
        //                 'containerId': 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948',
        //                 'workspaceId': '5559edd38968ec073600683',
        //                 'stepId': 'step_1',
        //                 'compId': '5559edd38968ec0736000456',
        //                 'function': 'passthrough',
        //                 'start': sinon.match.number,
        //                 'cid': 1,
        //                 'end': sinon.match.number,
        //                 'messageId': sinon.match.string,
        //                 'x-eio-routing-key': 'test.hello'
        //             })
        //         );
        //
        //         expect(fakeAMQPConnection.ack).to.have.been.calledOnce.and.calledWith(message);
        //     }
        // );
        //
        // it(
        //     'should not augment emitted message with passthrough with data from incoming message '
        //     + 'if NO_SELF_PASSTRHOUGH set without stepId header',
        //     async () => {
        //
        //         delete message.properties.headers.stepId;
        //
        //         settings.FUNCTION = 'passthrough';
        //         settings.NO_SELF_PASSTRHOUGH = true;
        //         const ferryman = new Ferryman(settings);
        //
        //         sandbox.stub(ferryman.apiClient.tasks, 'retrieveStep').callsFake((taskId, stepId) => {
        //             expect(taskId).to.deep.equal('5559edd38968ec0736000003');
        //             expect(stepId).to.deep.equal('step_1');
        //             return Promise.resolve({ is_passthrough: true });
        //         });
        //
        //
        //         const psPayload = {
        //             body: payload,
        //             passthrough: {
        //                 step_oth: {
        //                     body: { key: 'value' }
        //                 }
        //             }
        //         };
        //
        //
        //         await ferryman.connect();
        //         await ferryman.prepare();
        //         await ferryman.processMessage(psPayload, message);
        //         expect(ferryman.apiClient.tasks.retrieveStep).to.have.callCount(1);
        //         expect(fakeAMQPConnection.connect).to.have.been.calledOnce;
        //         expect(fakeAMQPConnection.sendBackChannel).to.have.been.calledOnce.and.calledWith(
        //             {
        //                 body: {
        //                     param1: 'Value1'
        //                 },
        //                 passthrough: {
        //                     step_oth: {
        //                         body: {
        //                             key: 'value'
        //                         }
        //                     }
        //                 }
        //             },
        //             sinon.match({
        //                 'execId': 'some-exec-id',
        //                 'taskId': '5559edd38968ec0736000003',
        //                 'userId': '5559edd38968ec0736000002',
        //                 'containerId': 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948',
        //                 'workspaceId': '5559edd38968ec073600683',
        //                 // 'stepId': 'step_1',
        //                 'compId': '5559edd38968ec0736000456',
        //                 'function': 'passthrough',
        //                 'start': sinon.match.number,
        //                 'cid': 1,
        //                 'end': sinon.match.number,
        //                 'messageId': sinon.match.string,
        //                 'x-eio-routing-key': 'test.hello'
        //             })
        //         );
        //
        //         expect(fakeAMQPConnection.ack).to.have.been.calledOnce.and.calledWith(message);
        //
        //         message.properties.headers.stepId = 'step_1';
        //     }
        // );

        // it('should provide access to flow variables', async () => {
        //     settings.FUNCTION = 'use_flow_variables';
        //     const ferryman = new Ferryman(settings);
        //
        //     sandbox.stub(ferryman.apiClient.tasks, 'retrieveStep').callsFake((taskId, stepId) => {
        //         expect(taskId).to.deep.equal('5559edd38968ec0736000003');
        //         expect(stepId).to.deep.equal('step_1');
        //         return Promise.resolve({
        //             is_passthrough: true,
        //             variables: {
        //                 var1: 'val1',
        //                 var2: 'val2'
        //             }
        //         });
        //     });
        //
        //     const psPayload = {
        //         body: payload
        //     };
        //
        //     await ferryman.connect();
        //     await ferryman.prepare();
        //     await ferryman.processMessage(psPayload, message);
        //     expect(fakeAMQPConnection.sendBackChannel).to.have.been.calledOnce.and.calledWith(sinon.match({
        //         body: {
        //             var1: 'val1',
        //             var2: 'val2'
        //         }
        //     }));
        // });

        // it('should send request to API server to update keys', async () => {
        //   // settings.FUNCTION = 'keys_trigger';
        //   const ferryman = new Ferryman(settings);
        //
        //   const orchestratorToken = makeOrchestratorToken('keys_trigger');
        //
        //   message.properties.headers.orchestratorToken = orchestratorToken;
        //
        //   sandbox.stub(ferryman.apiClient.accounts, 'update').callsFake((accountId, keys) => {
        //     expect(accountId).to.deep.equal('1234567890');
        //     expect(keys).to.deep.equal({ keys: { oauth: { access_token: 'newAccessToken' } } });
        //     return Promise.resolve();
        //   });
        //
        //   await ferryman.prepare();
        //   await ferryman.connect();
        //   await ferryman.processMessage(payload, message);
        //
        //   expect(ferryman.apiClient.accounts.update).to.have.been.calledOnce;
        //   expect(fakeAMQPConnection.connect).to.have.been.calledOnce;
        //   expect(fakeAMQPConnection.ack).to.have.been.calledOnce.and.calledWith(message);
        // });

        // it('should emit error if failed to update keys', async () => {
        //   // settings.FUNCTION = 'keys_trigger';
        //   const ferryman = new Ferryman(settings);
        //
        //   const orchestratorToken = makeOrchestratorToken('keys_trigger');
        //
        //   message.properties.headers.orchestratorToken = orchestratorToken;
        //
        //   sandbox.stub(ferryman.apiClient.accounts, 'update').callsFake((accountId, keys) => {
        //     expect(accountId).to.deep.equal('1234567890');
        //     expect(keys).to.deep.equal({ keys: { oauth: { access_token: 'newAccessToken' } } });
        //     return Promise.reject(new Error('Update keys error'));
        //   });
        //   await ferryman.prepare();
        //   await ferryman.connect();
        //   await ferryman.processMessage(payload, message);
        //   // It will not throw an error because component
        //   // process method is not `async`
        //
        //   expect(ferryman.apiClient.accounts.update).to.have.been.calledOnce;
        //
        //   expect(fakeAMQPConnection.connect).to.have.been.calledOnce;
        //   expect(fakeAMQPConnection.sendError).to.have.been.calledOnce.and.calledWith(sinon.match({
        //     message: 'Update keys error',
        //   }));
        //   expect(fakeAMQPConnection.ack).to.have.been.calledOnce.and.calledWith(message);
        // });

        it('should call sendRebound() and ack()', async () => {
            // settings.FUNCTION = 'rebound_trigger';
            const ferryman = new Ferryman(settings);

            const orchestratorToken = makeOrchestratorToken('rebound_trigger');

            message.properties.headers.orchestratorToken = orchestratorToken;

            await ferryman.prepare();
            await ferryman.connect();
            await ferryman.processMessage(payload, message);

            expect(fakeAMQPConnection.sendRebound).to.have.been.calledOnce.and.calledWith(sinon.match({
                message: 'Rebound reason'
            }));
            expect(fakeAMQPConnection.ack).to.have.been.calledOnce.and.calledWith(message);
        });

        it('should call sendSnapshot() and ack() after a `snapshot` event', async () => {
            // settings.FUNCTION = 'update';
            const ferryman = new Ferryman(settings);

            const orchestratorToken = makeOrchestratorToken('update');

            message.properties.headers.orchestratorToken = orchestratorToken;

            await ferryman.prepare();
            await ferryman.connect();
            const currentPayload = {
                snapshot: { blabla: 'blablabla' }
            };
            await ferryman.processMessage(currentPayload, message);

            const expectedSnapshot = { blabla: 'blablabla' };
            expect(fakeAMQPConnection.connect).to.have.been.calledOnce;

            expect(fakeAMQPConnection.sendSnapshot).to.have.been.calledOnce.and.calledWith(
                expectedSnapshot,
                sinon.match({
                    'taskId': '5559edd38968ec0736000003',
                    'execId': 'some-exec-id',
                    'userId': '5559edd38968ec0736000002',
                    'containerId': 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948',
                    'workspaceId': '5559edd38968ec073600683',
                    'stepId': 'step_1',
                    'compId': '5559edd38968ec0736000456',
                    'function': 'update',
                    'start': sinon.match.number,
                    'cid': 1,
                    'snapshotEvent': 'snapshot',
                    'messageId': sinon.match.string,
                    'x-eio-routing-key': 'test.hello'
                })
            );
            expect(fakeAMQPConnection.ack).to.have.been.calledOnce.and.calledWith(message);
        });

        it('should call sendSnapshot() and ack() after an `updateSnapshot` event', async () => {
            // settings.FUNCTION = 'update';
            const ferryman = new Ferryman(settings);

            const orchestratorToken = makeOrchestratorToken('update');

            message.properties.headers.orchestratorToken = orchestratorToken;

            await ferryman.prepare();
            await ferryman.connect();
            const currentPayload = {
                updateSnapshot: { value: 'new value' }
            };
            await ferryman.processMessage(currentPayload, message);

            const expectedSnapshot = { id: '123456789', value: 'new value' };
            expect(fakeAMQPConnection.connect).to.have.been.calledOnce;

            expect(fakeAMQPConnection.sendSnapshot).to.have.been.calledOnce.and.calledWith(
                { value: 'new value' },
                sinon.match({
                    'taskId': '5559edd38968ec0736000003',
                    'execId': 'some-exec-id',
                    'userId': '5559edd38968ec0736000002',
                    'containerId': 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948',
                    'workspaceId': '5559edd38968ec073600683',
                    'stepId': 'step_1',
                    'compId': '5559edd38968ec0736000456',
                    'function': 'update',
                    'start': sinon.match.number,
                    'cid': 1,
                    'snapshotEvent': 'updateSnapshot',
                    'messageId': sinon.match.string,
                    'x-eio-routing-key': 'test.hello'
                })
            );

            expect(fakeAMQPConnection.ack).to.have.been.calledOnce.and.calledWith(message);
        });

        it('should send error if error happened', async () => {
            // settings.FUNCTION = 'error_trigger';
            const ferryman = new Ferryman(settings);

            const orchestratorToken = makeOrchestratorToken('error_trigger');

            message.properties.headers.orchestratorToken = orchestratorToken;

            await ferryman.prepare();
            await ferryman.connect();
            await ferryman.processMessage(payload, message);

            expect(fakeAMQPConnection.connect).to.have.been.calledOnce;

            expect(fakeAMQPConnection.sendError).to.have.been.calledOnce.and.calledWith(
                sinon.match({
                    message: 'Some component error',
                    stack: sinon.match.string
                }),
                sinon.match.object,
                message
            );

            expect(fakeAMQPConnection.reject).to.have.been.calledOnce.and.calledWith(message);
        });

        it('should send error and reject only once()', async () => {
            // settings.FUNCTION = 'end_after_error_twice';
            const ferryman = new Ferryman(settings);

            const orchestratorToken = makeOrchestratorToken('end_after_error_twice');

            message.properties.headers.orchestratorToken = orchestratorToken;

            await ferryman.prepare();
            await ferryman.connect();
            await ferryman.processMessage(payload, message);

            expect(fakeAMQPConnection.connect).to.have.been.calledOnce;

            expect(fakeAMQPConnection.sendError).to.have.been.calledOnce;

            expect(fakeAMQPConnection.ack).not.to.have.been.called;
            expect(fakeAMQPConnection.reject).to.have.been.calledOnce;
        });

        it('should reject message if trigger is missing', async () => {
            // settings.FUNCTION = 'missing_trigger';
            const ferryman = new Ferryman(settings);

            const orchestratorToken = makeOrchestratorToken('missing_trigger');

            message.properties.headers.orchestratorToken = orchestratorToken;

            await ferryman.prepare();
            await ferryman.connect();
            await ferryman.processMessage(payload, message);

            expect(fakeAMQPConnection.connect).to.have.been.calledOnce;

            expect(fakeAMQPConnection.sendError).to.have.been.calledOnce.and.calledWith(
                sinon.match({
                    /* eslint-disable max-len */
                    message: sinon.match(/Failed to load file '.\/triggers\/missing_trigger.js': Cannot find module.+missing_trigger\.js/),
                    /* eslint-enable max-len */

                    stack: sinon.match.truthy
                }),
                sinon.match.object,
                message
            );

            expect(fakeAMQPConnection.reject).to.have.been.calledOnce.and.calledWith(message);
        });

        it('should not process message if taskId in header is not equal to task._id', async () => {
            const message2 = _.cloneDeep(message);
            message2.properties.headers.taskId = 'othertaskid';

            // settings.FUNCTION = 'error_trigger';
            const ferryman = new Ferryman(settings);

            const orchestratorToken = makeOrchestratorToken('error_trigger');

            message2.properties.headers.orchestratorToken = orchestratorToken;

            await ferryman.prepare();
            await ferryman.connect();
            await ferryman.processMessage(payload, message2);

            expect(fakeAMQPConnection.reject).to.have.been.calledOnce;
        });

        it('should catch all data calls and all error calls', async () => {
            // settings.FUNCTION = 'datas_and_errors';

            const ferryman = new Ferryman(settings);

            const orchestratorToken = makeOrchestratorToken('datas_and_errors');

            message.properties.headers.orchestratorToken = orchestratorToken;

            await ferryman.prepare();
            await ferryman.connect();
            await ferryman.processMessage(payload, message);

            expect(fakeAMQPConnection.connect).to.have.been.calledOnce;

            // data
            expect(fakeAMQPConnection.sendBackChannel).to.have.callCount(3);

            // error
            expect(fakeAMQPConnection.sendError).to.have.callCount(2);

            // ack
            expect(fakeAMQPConnection.reject).to.have.been.calledOnce.and.calledWith(message);
        });

        it('should handle errors in httpReply properly', async () => {
            // settings.FUNCTION = 'http_reply';
            const ferryman = new Ferryman(settings);

            const orchestratorToken = makeOrchestratorToken('http_reply');

            message.properties.headers.orchestratorToken = orchestratorToken;

            await ferryman.connect();
            await ferryman.prepare();
            await ferryman.processMessage(payload, message);

            expect(fakeAMQPConnection.connect).to.have.been.calledOnce;
            expect(fakeAMQPConnection.sendHttpReply).to.have.been.calledOnce.and.calledWith(
                {
                    statusCode: 200,
                    body: 'Ok',
                    headers: {
                        'content-type': 'text/plain'
                    },
                    passedCfg: { nodeSettings: { idLinking: true, appId: 'SomeApp' } }
                },
                sinon.match({
                    'execId': 'some-exec-id',
                    'taskId': '5559edd38968ec0736000003',
                    'userId': '5559edd38968ec0736000002',
                    'containerId': 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948',
                    'workspaceId': '5559edd38968ec073600683',
                    'stepId': 'step_1',
                    'compId': '5559edd38968ec0736000456',
                    'function': 'http_reply',
                    'start': sinon.match.number,
                    'cid': 1,
                    'messageId': sinon.match.string,
                    'parentMessageId': message.properties.headers.messageId,
                    'threadId': message.properties.headers.threadId,
                    'x-eio-routing-key': 'test.hello'
                })
            );

            expect(fakeAMQPConnection.sendBackChannel).to.have.been.calledOnce.and.calledWith(
                {
                    body: {}
                },
                sinon.match({
                    'execId': 'some-exec-id',
                    'taskId': '5559edd38968ec0736000003',
                    'userId': '5559edd38968ec0736000002',
                    'containerId': 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948',
                    'workspaceId': '5559edd38968ec073600683',
                    'stepId': 'step_1',
                    'compId': '5559edd38968ec0736000456',
                    'function': 'http_reply',
                    'start': sinon.match.number,
                    'cid': 1,
                    'end': sinon.match.number,
                    'messageId': sinon.match.string,
                    'parentMessageId': message.properties.headers.messageId,
                    'threadId': message.properties.headers.threadId,
                    'x-eio-routing-key': 'test.hello'
                })
            );
            expect(fakeAMQPConnection.ack).to.have.been.calledOnce.and.calledWith(message);
        });

        it('should handle errors in httpReply properly', async () => {
            // settings.FUNCTION = 'http_reply';
            const ferryman = new Ferryman(settings);

            fakeAMQPConnection.sendHttpReply.callsFake(() => {
                throw new Error('Failed to send HTTP reply');
            });

            const orchestratorToken = makeOrchestratorToken('http_reply');

            message.properties.headers.orchestratorToken = orchestratorToken;

            await ferryman.connect();
            await ferryman.prepare();
            await ferryman.processMessage(payload, message);

            expect(fakeAMQPConnection.connect).to.have.been.calledOnce;
            expect(fakeAMQPConnection.sendHttpReply).to.have.been.calledOnce.and.calledWith(
                {
                    statusCode: 200,
                    body: 'Ok',
                    headers: {
                        'content-type': 'text/plain'
                    },
                    passedCfg: { nodeSettings: { idLinking: true, appId: 'SomeApp' } }
                },
                sinon.match({
                    'execId': 'some-exec-id',
                    'taskId': '5559edd38968ec0736000003',
                    'userId': '5559edd38968ec0736000002',
                    'containerId': 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948',
                    'workspaceId': '5559edd38968ec073600683',
                    'stepId': 'step_1',
                    'compId': '5559edd38968ec0736000456',
                    'function': 'http_reply',
                    'start': sinon.match.number,
                    'cid': 1,
                    'messageId': sinon.match.string,
                    'parentMessageId': message.properties.headers.messageId,
                    'threadId': message.properties.headers.threadId,
                    'x-eio-routing-key': 'test.hello'
                })
            );

            expect(fakeAMQPConnection.sendBackChannel).not.to.have.been.called;
            expect(fakeAMQPConnection.ack).not.to.have.been.called;

            // error
            expect(fakeAMQPConnection.sendError).to.have.been.calledOnce.and.calledWith(sinon.match({
                message: 'Failed to send HTTP reply',
                stack: sinon.match.truthy
            }));

            // ack
            expect(fakeAMQPConnection.reject).to.have.been.calledOnce.and.calledWith(message);
        });
    });
});
