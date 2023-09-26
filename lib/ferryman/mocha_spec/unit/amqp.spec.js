
/* eslint no-unused-expressions: 0 */ // --> OFF
/* eslint no-underscore-dangle: 0 */ // --> OFF
/* eslint max-len: 0 */ // --> OFF
/* eslint no-await-in-loop: 0 */ // --> OFF

const chai = require('chai');
const sinon = require('sinon');

const { expect } = chai;
chai.use(require('sinon-chai'));

const uuid = require('uuid');
const _ = require('lodash');
const pThrottle = require('p-throttle');

const Settings = require('../../lib/settings');
const encryptor = require('../../lib/encryptor.js');
const { Amqp } = require('../../lib/amqp.js');

describe('AMQP', () => {
    process.env.ELASTICIO_MESSAGE_CRYPTO_PASSWORD = 'testCryptoPassword';
    process.env.ELASTICIO_MESSAGE_CRYPTO_IV = 'iv=any16_symbols';

    const envVars = {};
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
    envVars.ELASTICIO_SNAPSHOT_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:snapshot';

    envVars.ELASTICIO_API_URI = 'http://apihost.com';
    envVars.ELASTICIO_API_USERNAME = 'test@test.com';
    envVars.ELASTICIO_API_KEY = '5559edd';

    const settings = Settings.readFrom(envVars);

    const message = {
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
                taskId: 'task1234567890',
                execId: 'exec1234567890',
                reply_to: 'replyTo1234567890',
                protocolVersion: 2
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
        content: encryptor.encryptMessageContent({ content: 'Message content' })
    };
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.spy(encryptor, 'decryptMessageContent');
    });
    afterEach(() => {
        sandbox.restore();
    });

    it('Should send message to outgoing channel when process data', async () => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = {
            on: sandbox.stub(),
            publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            })
        };

        const messageId = uuid.v4();
        const headers = {
            taskId: 'task1234567890',
            stepId: 'step_456',
            protocolVersion: 2,
            messageId
        };

        await amqp.sendBackChannel({
            headers: {
                'some-other-header': 'headerValue',
                messageId
            },
            body: 'Message content'
        }, headers);

        expect(amqp.publishChannel.publish).to.have.been.calledOnce.and.calledWith(
            settings.BACKCHANNEL_EXCHANGE,
            settings.OUTPUT_ROUTING_KEY,
            sinon.match((buf) => {
                const payload = encryptor.decryptMessageContent(buf, 'base64');
                expect(payload).to.deep.equal({
                    headers: {
                        'some-other-header': 'headerValue',
                        messageId
                    },
                    body: 'Message content'
                });
                return true;
            }),
            {
                contentType: 'application/json',
                contentEncoding: 'utf8',
                mandatory: true,
                persistent: true,
                headers: {
                    taskId: 'task1234567890',
                    stepId: 'step_456',
                    protocolVersion: 1,
                    messageId
                }
            },
            sinon.match.func
        );
    });

    it('Should send message to outgoing channel when process data for protocol version 1', async () => {
        const amqp = new Amqp(settings);
        delete amqp.settings.ELASTICIO_PROTOCOL_VERSION;
        amqp.publishChannel = {
            on: sandbox.stub(),
            publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            })
        };
        const messageId = uuid.v4();
        const headers = {
            taskId: 'task1234567890',
            stepId: 'step_456',
            messageId
        };

        await amqp.sendBackChannel({
            headers: {
                'some-other-header': 'headerValue'
            },
            body: 'Message content'
        }, headers);
        expect(amqp.publishChannel.publish).to.have.been.calledOnce.and.calledWith(
            settings.BACKCHANNEL_EXCHANGE,
            settings.OUTPUT_ROUTING_KEY,
            sinon.match((buf) => {
                const payload = encryptor.decryptMessageContent(buf, 'base64');
                return sinon.match({
                    headers: {
                        'some-other-header': 'headerValue'
                    },
                    body: 'Message content'
                }).test(payload);
            }),
            {
                contentType: 'application/json',
                contentEncoding: 'utf8',
                mandatory: true,
                persistent: true,
                headers: {
                    taskId: 'task1234567890',
                    stepId: 'step_456',
                    protocolVersion: 1,
                    messageId
                }
            },
            sinon.match.func
        );
    });

    it('Should send message channel when process data after `drain` event', async () => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = {
            on: sandbox.stub().callsFake((event, cb) => event === 'drain' && cb()),
            publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return false;
            })
        };
        const messageId = uuid.v4();
        const headers = {
            taskId: 'task1234567890',
            stepId: 'step_456',
            protocolVersion: 2,
            messageId
        };

        const result = await amqp.sendBackChannel({
            headers: {
                'some-other-header': 'headerValue',
                'protocolVersion': 2
            },
            body: 'Message content'
        }, headers);
        expect(result).to.deep.equal(true);

        expect(amqp.publishChannel.on).to.have.been.called.and.calledWith('drain', sinon.match.func);

        expect(amqp.publishChannel.publish).to.have.been.calledOnce
            .and.calledWith(
                settings.BACKCHANNEL_EXCHANGE,
                settings.OUTPUT_ROUTING_KEY,
                sinon.match((arg) => {
                    const payload = encryptor.decryptMessageContent(arg, 'base64');
                    return sinon.match({
                        headers: {
                            'some-other-header': 'headerValue',
                            'protocolVersion': 2
                        },
                        body: 'Message content'
                    }).test(payload);
                }),
                {
                    contentType: 'application/json',
                    contentEncoding: 'utf8',
                    mandatory: true,
                    persistent: true,
                    headers: {
                        taskId: 'task1234567890',
                        stepId: 'step_456',
                        protocolVersion: 1,
                        messageId
                    }
                },
                sinon.match.func
            );
    });

    it('Should send message async to outgoing channel when process data', async () => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = {
            on: sandbox.stub(),
            publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            })
        };

        const messageId = uuid.v4();
        const headers = {
            taskId: 'task1234567890',
            stepId: 'step_456',
            messageId
        };
        // One request every 500 ms
        const throttle = pThrottle(() => Promise.resolve(), 1, 500);
        const start = Date.now();

        for (let i = 0; i < 3; i += 1) {
            await amqp.sendBackChannel(
                {
                    headers: {
                        'some-other-header': 'headerValue'
                    },
                    body: 'Message content'
                },
                headers,
                throttle
            );
        }
        const duration = Math.round((Date.now() - start) / 1000);
        // Total duration should be around 1 seconds, because
        // first goes through
        // second throttled for 500ms
        // third throttled for another 500 ms
        expect(duration).to.equal(1);
        expect(amqp.publishChannel.publish).to.have.been.callCount(3);
        expect(amqp.publishChannel.publish).to.have.been.calledWith(
            settings.BACKCHANNEL_EXCHANGE,
            settings.OUTPUT_ROUTING_KEY,
            sinon.match((arg) => {
                const payload = encryptor.decryptMessageContent(arg, 'base64');
                return sinon.match({
                    headers: {
                        'some-other-header': 'headerValue'
                    },
                    body: 'Message content'
                }).test(payload);
            }),
            {
                contentType: 'application/json',
                contentEncoding: 'utf8',
                mandatory: true,
                persistent: true,
                headers: { ...headers, protocolVersion: settings.PROTOCOL_VERSION }
            },
            sinon.match.func
        );
    });

    it('Should throw error when message size exceeds limit', async () => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = {
            on: sandbox.stub(),
            publish: sandbox.stub()
        };

        const body = 'a'.repeat(settings.OUTGOING_MESSAGE_SIZE_LIMIT + 1);
        const headers = {};
        let caughtError;
        try {
            await amqp.sendBackChannel({ body }, headers);
        } catch (e) {
            caughtError = e;
        }
        expect(caughtError).to.be.instanceof(Error);
        expect(caughtError.message).to.equal('Outgoing message size 13981056 exceeds limit of 10485760.');
        expect(amqp.publishChannel.publish).not.to.have.been.called;
    });

    it(`Should send message to outgoing channel after ${settings.AMQP_PUBLISH_RETRY_ATTEMPTS} attempts`, async () => {
        const retryCount = settings.AMQP_PUBLISH_RETRY_ATTEMPTS;
        const amqp = new Amqp(settings);
        let iteration = 0;
        amqp.publishChannel = {
            on: sandbox.stub(),
            publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                iteration < retryCount - 1 ? cb('Some error') : cb(null, 'Success');
                iteration += 1;
                return true;
            })
        };
        sandbox.stub(amqp, '_sleep').resolves();
        const messageId = uuid.v4();
        const headers = {
            taskId: 'task1234567890',
            stepId: 'step_456',
            messageId
        };

        await amqp.sendBackChannel({
            headers: {
                'some-other-header': 'headerValue'
            },
            body: 'Message content'
        }, headers);
        expect(amqp.publishChannel.publish).to.have.been.callCount(retryCount);
        expect(amqp.publishChannel.publish).to.have.been.calledWith(
            settings.BACKCHANNEL_EXCHANGE,
            settings.OUTPUT_ROUTING_KEY,
            sinon.match((arg) => {
                const payload = encryptor.decryptMessageContent(arg, 'base64');
                return sinon.match({
                    headers: {
                        'some-other-header': 'headerValue'
                    },
                    body: 'Message content'
                }).test(payload);
            }),
            {
                contentType: 'application/json',
                contentEncoding: 'utf8',
                mandatory: true,
                persistent: true,
                headers: {
                    taskId: 'task1234567890',
                    stepId: 'step_456',
                    protocolVersion: settings.PROTOCOL_VERSION,
                    messageId,
                    retry: retryCount - 1
                }
            },
            sinon.match.func
        );
    });

    // it(`Should throw error after ${settings.AMQP_PUBLISH_RETRY_ATTEMPTS} attempts to publish message`,
    //     async function test() {
    //         this.timeout(20000); // eslint-disable-line
    //         const retryCount = envVars.ELASTICIO_AMQP_PUBLISH_RETRY_ATTEMPTS;
    //         const amqp = new Amqp(settings);
    //         amqp.publishChannel = {
    //             on: sandbox.stub(),
    //             publish: sandbox.stub()
    //                 .callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => cb('Some error'))
    //         };
    //         sandbox.spy(amqp, '_getDelay');
    //         sandbox.stub(amqp, '_sleep').resolves();
    //         const messageId = uuid.v4();
    //         const headers = {
    //             taskId: 'task1234567890',
    //             stepId: 'step_456',
    //             messageId
    //         };
    //         let caughtError;
    //         try {
    //             await amqp.sendBackChannel({
    //                 headers: {
    //                     'some-other-header': 'headerValue'
    //                 },
    //                 body: 'Message content'
    //             }, headers);
    //         } catch (e) {
    //             caughtError = e;
    //         }
    //         expect(caughtError).to.be.instanceof(Error);
    //         expect(amqp._getDelay).to.have.been.callCount(retryCount);
    //         expect(amqp._sleep).to.have.been.callCount(10);
    //         expect(amqp.publishChannel.publish).to.have.been.callCount(retryCount).and.calledWith(
    //             settings.BACKCHANNEL_EXCHANGE,
    //             settings.OUTPUT_ROUTING_KEY,
    //             sinon.match((arg) => {
    //                 const payload = encryptor.decryptMessageContent(arg, 'base64');
    //                 return sinon.match({
    //                     headers: {
    //                         'some-other-header': 'headerValue'
    //                     },
    //                     body: 'Message content'
    //                 }).test(payload);
    //             }),
    //             {
    //                 contentType: 'application/json',
    //                 contentEncoding: 'utf8',
    //                 mandatory: true,
    //                 persistent: true,
    //                 headers: {
    //                     taskId: 'task1234567890',
    //                     stepId: 'step_456',
    //                     protocolVersion: settings.PROTOCOL_VERSION,
    //                     messageId,
    //                     retry: retryCount - 1
    //                 }
    //             },
    //             sinon.match.func,
    //         );
    //     });

    it('Should sendHttpReply to outgoing channel using routing key from headers when process data', async () => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = {
            on: sandbox.stub(),
            publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            })
        };

        const msg = {
            statusCode: 200,
            headers: {
                'content-type': 'text/plain'
            },
            body: 'OK'
        };
        const messageId = uuid.v4();
        const headers = {
            taskId: 'task1234567890',
            stepId: 'step_456',
            reply_to: 'my-special-routing-key',
            messageId
        };
        await amqp.sendHttpReply(msg, headers);
        expect(amqp.publishChannel.publish).to.have.been.calledOnce.and.calledWith(
            settings.BACKCHANNEL_EXCHANGE,
            'my-special-routing-key',
            sinon.match(arg => arg.toString('hex') === encryptor.encryptMessageContent(msg, 'base64').toString('hex')),
            {
                contentType: 'application/json',
                contentEncoding: 'utf8',
                mandatory: true,
                persistent: true,
                headers: {
                    taskId: 'task1234567890',
                    stepId: 'step_456',
                    reply_to: 'my-special-routing-key',
                    protocolVersion: 1,
                    messageId
                }
            }
        );
    });

    it('Should throw error in sendHttpReply if reply_to header not found', async () => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = {
            on: sandbox.stub(),
            publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            })
        };

        const msg = {
            statusCode: 200,
            headers: {
                'content-type': 'text/plain'
            },
            body: 'OK'
        };
        let caughtError;
        try {
            await amqp.sendHttpReply(msg, {
                contentType: 'application/json',
                contentEncoding: 'utf8',
                mandatory: true,
                persistent: true,
                headers: {
                    taskId: 'task1234567890',
                    stepId: 'step_456'
                }
            });
        } catch (e) {
            caughtError = e;
        }
        expect(caughtError).to.be.instanceof(Error);
        expect(amqp.publishChannel.publish).not.to.have.been.called;
    });

    it('Should send message to outgoing channel using routing key from headers when process data', async () => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = {
            on: sandbox.stub(),
            publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            })
        };

        const msg = {
            headers: {
                'X-EIO-Routing-Key': 'my-special-routing-key'
            },
            body: {
                content: 'Message content'
            }
        };
        const messageId = uuid.v4();
        const headers = {
            taskId: 'task1234567890',
            stepId: 'step_456',
            messageId
        };

        await amqp.sendBackChannel(msg, headers);
        expect(amqp.publishChannel.publish).to.have.been.calledOnce.and.calledWith(
            settings.BACKCHANNEL_EXCHANGE,
            'my-special-routing-key',
            sinon.match((arg) => {
                const payload = encryptor.decryptMessageContent(arg, 'base64');
                return sinon.match({
                    headers: {},
                    body: {
                        content: 'Message content'
                    }
                }).test(payload);
            }),
            {
                contentType: 'application/json',
                contentEncoding: 'utf8',
                mandatory: true,
                persistent: true,
                headers: {
                    taskId: 'task1234567890',
                    stepId: 'step_456',
                    protocolVersion: settings.PROTOCOL_VERSION,
                    messageId
                }
            },
            sinon.match.func
        );
    });

    it('Should send message to errors when process error', async () => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = {
            on: sandbox.stub(),
            publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            })
        };
        const messageId = uuid.v4();
        const headers = {
            taskId: 'task1234567890',
            stepId: 'step_456',
            protocolVersion: 1,
            messageId
        };

        await amqp.sendError(new Error('Test error'), headers, message);
        expect(amqp.publishChannel.publish).to.have.been.calledOnce.and.calledWith(
            settings.BACKCHANNEL_EXCHANGE,
            settings.ERROR_ROUTING_KEY,
            sinon.match((arg) => {
                const payload = JSON.parse(arg.toString());
                payload.error = encryptor.decryptMessageContent(payload.error, 'base64');
                payload.errorInput = encryptor.decryptMessageContent(payload.errorInput, 'base64');
                return sinon.match({
                    error: {
                        name: 'Error',
                        message: 'Test error',
                        stack: sinon.match.string
                    },
                    errorInput: {
                        content: 'Message content'
                    }
                }).test(payload);
            }),
            {
                contentType: 'application/json',
                contentEncoding: 'utf8',
                mandatory: true,
                persistent: true,
                headers: {
                    taskId: 'task1234567890',
                    stepId: 'step_456',
                    protocolVersion: 1,
                    messageId
                }
            },
            sinon.match.func
        );
    });

    // it('Should send message to errors using routing key from headers when process error', async () => {
    //   const expectedErrorPayload = {
    //     error: {
    //       name: 'Error',
    //       message: 'Test error',
    //       stack: sinon.match.string,
    //     },
    //     errorInput: {
    //       content: 'Message content',
    //     },
    //   };
    //
    //   const amqp = new Amqp(settings);
    //   amqp.publishChannel = {
    //     on: sandbox.stub(),
    //     publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
    //       cb(null, 'Success');
    //       return true;
    //     }),
    //   };
    //   const messageId = uuid.v4();
    //   const headers = {
    //     taskId: 'task1234567890',
    //     stepId: 'step_456',
    //     reply_to: 'my-special-routing-key',
    //     protocolVersion: 1,
    //     messageId,
    //   };
    //
    //   await amqp.sendError(new Error('Test error'), headers, message);
    //   expect(amqp.publishChannel.publish).to.have.been.calledTwice
    //     .and.calledWith(
    //       settings.BACKCHANNEL_EXCHANGE,
    //       '5559edd38968ec0736000003:step_1:1432205514864:error',
    //       sinon.match((arg) => {
    //         const payload = JSON.parse(arg.toString());
    //         payload.error = encryptor.decryptMessageContent(payload.error, 'base64');
    //         payload.errorInput = encryptor.decryptMessageContent(payload.errorInput, 'base64');
    //
    //         return sinon.match(expectedErrorPayload).test(payload);
    //       }),
    //       {
    //         contentType: 'application/json',
    //         contentEncoding: 'utf8',
    //         mandatory: true,
    //         persistent: true,
    //         headers: {
    //           messageId,
    //           taskId: 'task1234567890',
    //           stepId: 'step_456',
    //           reply_to: 'my-special-routing-key',
    //           protocolVersion: 1,
    //         },
    //       },
    //     )
    //     .and.calledWith(
    //       settings.BACKCHANNEL_EXCHANGE,
    //       'my-special-routing-key',
    //       sinon.match((arg) => {
    //         const payload = encryptor.decryptMessageContent(arg.toString(), 'base64');
    //         return sinon.match(expectedErrorPayload.error).test(payload);
    //       }),
    //       {
    //         contentType: 'application/json',
    //         contentEncoding: 'utf8',
    //         mandatory: true,
    //         persistent: true,
    //         headers: {
    //           messageId,
    //           taskId: 'task1234567890',
    //           stepId: 'step_456',
    //           reply_to: 'my-special-routing-key',
    //           'x-eio-error-response': true,
    //           protocolVersion: 1,
    //         },
    //       },
    //     );
    // });

    it('Should not provide errorInput if errorInput was empty', async () => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = {
            on: sandbox.stub(),
            publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            })
        };
        const messageId = uuid.v4();
        const headers = {
            taskId: 'task1234567890',
            stepId: 'step_456',
            protocolVersion: 2,
            messageId
        };

        await amqp.sendError(new Error('Test error'), headers, {});
        expect(amqp.publishChannel.publish).to.have.been.calledOnce.and.calledWith(
            settings.BACKCHANNEL_EXCHANGE,
            '5559edd38968ec0736000003:step_1:1432205514864:error',
            sinon.match((arg) => {
                const payload = JSON.parse(arg.toString());
                payload.error = encryptor.decryptMessageContent(payload.error, 'base64');

                return sinon.match({
                    error: {
                        name: 'Error',
                        message: 'Test error',
                        stack: sinon.match.string
                    }
                    // no errorInput should be here
                }).test(payload);
            }),
            {
                contentType: 'application/json',
                contentEncoding: 'utf8',
                mandatory: true,
                persistent: true,
                headers: {
                    taskId: 'task1234567890',
                    stepId: 'step_456',
                    protocolVersion: 2,
                    messageId
                }
            }
        );
    });

    it('Should not provide errorInput if errorInput was null', async () => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = {
            on: sandbox.stub(),
            publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            })
        };
        const messageId = uuid.v4();
        const headers = {
            taskId: 'task1234567890',
            stepId: 'step_456',
            protocolVersion: 2,
            messageId
        };

        await amqp.sendError(new Error('Test error'), headers, null);
        expect(amqp.publishChannel.publish).to.have.been.calledOnce.and.calledWith(
            settings.BACKCHANNEL_EXCHANGE,
            '5559edd38968ec0736000003:step_1:1432205514864:error',
            sinon.match((arg) => {
                const payload = JSON.parse(arg.toString());
                payload.error = encryptor.decryptMessageContent(payload.error, 'base64');
                return sinon.match({
                    error: {
                        name: 'Error',
                        message: 'Test error',
                        stack: sinon.match.string
                    }
                    // no errorInput should be here
                }).test(payload);
            }),
            {
                contentType: 'application/json',
                contentEncoding: 'utf8',
                mandatory: true,
                persistent: true,
                headers: {
                    messageId,
                    taskId: 'task1234567890',
                    stepId: 'step_456',
                    protocolVersion: 2
                }
            },
            sinon.match.func
        );
    });

    it('Should send message to rebounds when rebound happened', async () => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = {
            on: sandbox.stub(),
            publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            })
        };
        const messageId = uuid.v4();
        const headers = {
            execId: 'exec1234567890',
            taskId: 'task1234567890',
            stepId: 'step_1',
            compId: 'comp1',
            function: 'list',
            start: '1432815685034',
            protocolVersion: 2,
            messageId
        };

        await amqp.sendRebound(new Error('Rebound error'), message, headers);
        expect(amqp.publishChannel.publish).to.have.been.calledOnce.and.calledWith(
            settings.NODE_EXCHANGE,
            settings.REBOUND_ROUTING_KEY,
            sinon.match((arg) => {
                const payload = encryptor.decryptMessageContent(arg);
                expect(payload).to.deep.equal({ content: 'Message content' });
                return true;
            }),
            {
                contentType: 'application/json',
                contentEncoding: 'utf8',
                mandatory: true,
                persistent: true,
                expiration: 15000,
                headers: {
                    execId: 'exec1234567890',
                    taskId: 'task1234567890',
                    stepId: 'step_1',
                    compId: 'comp1',
                    function: 'list',
                    start: '1432815685034',
                    reboundIteration: 1,
                    protocolVersion: 2,
                    messageId
                }
            },
            sinon.match.func
        );
    });

    it('Should send message to rebounds with reboundIteration=3', async () => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = {
            on: sandbox.stub(),
            publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            })
        };
        const messageId = uuid.v4();
        const headers = {
            execId: 'exec1234567890',
            taskId: 'task1234567890',
            stepId: 'step_1',
            compId: 'comp1',
            function: 'list',
            start: '1432815685034',
            protocolVersion: 2,
            messageId
        };

        const clonedMessage = _.cloneDeep(message);
        clonedMessage.properties.headers.reboundIteration = 2;

        await amqp.sendRebound(new Error('Rebound error'), clonedMessage, headers);
        expect(amqp.publishChannel.publish).to.have.been.calledOnce.and.calledWith(
            settings.NODE_EXCHANGE,
            settings.REBOUND_ROUTING_KEY,
            sinon.match((arg) => {
                const payload = encryptor.decryptMessageContent(arg);
                expect(payload).to.deep.equal({ content: 'Message content' });
                return true;
            }),
            {
                contentType: 'application/json',
                contentEncoding: 'utf8',
                mandatory: true,
                persistent: true,
                expiration: 60000,
                headers: {
                    execId: 'exec1234567890',
                    taskId: 'task1234567890',
                    stepId: 'step_1',
                    compId: 'comp1',
                    function: 'list',
                    start: '1432815685034',
                    reboundIteration: 3,
                    protocolVersion: 2,
                    messageId
                }
            },
            sinon.match.func
        );
    });

    it('Should send message to errors when rebound limit exceeded', async () => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = {
            on: sandbox.stub(),
            publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            })
        };
        const messageId = uuid.v4();
        const headers = {
            execId: 'exec1234567890',
            taskId: 'task1234567890',
            stepId: 'step_1',
            compId: 'comp1',
            function: 'list',
            start: '1432815685034',
            protocolVersion: 2,
            messageId
        };

        const clonedMessage = _.cloneDeep(message);
        clonedMessage.properties.headers.reboundIteration = 100;

        await amqp.sendRebound(new Error('Rebound error'), clonedMessage, headers);
        expect(amqp.publishChannel.publish).to.have.been.calledOnce.and.calledWith(
            settings.BACKCHANNEL_EXCHANGE,
            settings.ERROR_ROUTING_KEY,
            sinon.match((arg) => {
                const payload = JSON.parse(arg.toString());
                payload.error = encryptor.decryptMessageContent(payload.error, 'base64');
                payload.errorInput = encryptor.decryptMessageContent(payload.errorInput, 'base64');

                expect(payload.error.message).to.deep.equal('Rebound limit exceeded');
                expect(payload.errorInput).to.deep.equal({ content: 'Message content' });
                return true;
            }),
            {
                contentType: 'application/json',
                contentEncoding: 'utf8',
                mandatory: true,
                persistent: true,
                headers: {
                    execId: 'exec1234567890',
                    taskId: 'task1234567890',
                    stepId: 'step_1',
                    compId: 'comp1',
                    function: 'list',
                    start: '1432815685034',
                    protocolVersion: 2,
                    messageId
                }
            },
            sinon.match.func
        );
    });

    it('Should ack message when confirmed', () => {
        const amqp = new Amqp();
        amqp.subscribeChannel = {
            ack: sandbox.stub()
        };

        amqp.ack(message);

        expect(amqp.subscribeChannel.ack).to.have.been.calledOnce.and.calledWith(message);
    });

    it('Should reject message when ack is called with false', () => {
        const amqp = new Amqp(settings);
        amqp.subscribeChannel = {
            reject: sandbox.stub()
        };
        amqp.reject(message);

        expect(amqp.subscribeChannel.reject).to.have.been.calledOnce.and.calledWith(message, false);
    });
    //
    // it('Should listen queue and pass decrypted message to client function with protocol version 1', async () => {
    //   const newMessage = {
    //     fields: {
    //       consumerTag: 'abcde',
    //       deliveryTag: 12345,
    //       exchange: 'test',
    //       routingKey: 'test.hello',
    //     },
    //     properties: {
    //       contentType: 'application/json',
    //       contentEncoding: 'utf8',
    //       headers: {
    //         taskId: 'task1234567890',
    //         execId: 'exec1234567890',
    //         reply_to: 'replyTo1234567890',
    //       },
    //       deliveryMode: undefined,
    //       priority: undefined,
    //       correlationId: undefined,
    //       replyTo: undefined,
    //       expiration: undefined,
    //       messageId: undefined,
    //       timestamp: undefined,
    //       type: undefined,
    //       userId: undefined,
    //       appId: undefined,
    //       mandatory: true,
    //       persistent: true,
    //       clusterId: '',
    //     },
    //     content: encryptor.encryptMessageContent(
    //       { content: 'Message content' },
    //       'base64',
    //     ),
    //   };
    //
    //   const amqp = new Amqp(settings);
    //   let rejectedMessage;
    //   const clientFunction = sandbox.stub();
    //   amqp.subscribeChannel = {
    //     consume: sandbox.stub(),
    //     prefetch: sandbox.stub(),
    //     reject: sandbox.stub(),
    //   };
    //   amqp.subscribeChannel.consume.callsFake((queueName, callback) => {
    //     callback(newMessage);
    //     return {
    //       consumerTag: newMessage.fields.consumerTag,
    //     };
    //   });
    //   amqp.subscribeChannel.reject.callsFake((currentMessage) => {
    //     rejectedMessage = currentMessage;
    //   });
    //
    //   await amqp.listenQueue('testQueue', clientFunction);
    //   while (clientFunction.callCount <= 0 && !rejectedMessage) {
    //     await new Promise(resolve => setTimeout(resolve, 100));
    //   }
    //   expect(rejectedMessage).to.be.undefined;
    //   expect(amqp.subscribeChannel.prefetch).to.have.been.calledOnce;
    //   expect(clientFunction).to.have.been.calledOnce.and.calledWith(
    //     {
    //       headers: {
    //         reply_to: 'replyTo1234567890',
    //       },
    //       content: 'Message content',
    //     },
    //     message,
    //   );
    //
    //   expect(encryptor.decryptMessageContent).to.have.been.calledOnce.and.calledWith(
    //     message.content,
    //     'base64',
    //   );
    // });
    it('Should listen queue and pass decrypted message to client function with protocol version 2', async () => {
        const amqp = new Amqp(settings);
        const clientFunction = sandbox.stub();
        amqp.subscribeChannel = {
            consume: sandbox.stub(),
            prefetch: sandbox.stub()
        };

        amqp.subscribeChannel.consume.callsFake((queueName, callback) => {
            callback(message);
            return {
                consumerTag: message.fields.consumerTag
            };
        });

        await amqp.listenQueue('testQueue', clientFunction);
        while (clientFunction.callCount <= 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        expect(amqp.subscribeChannel.prefetch).to.have.been.calledOnce.and.calledWith(1);
        expect(clientFunction).to.have.been.calledOnce.and.calledWith(
            {
                headers: {
                    reply_to: 'replyTo1234567890'
                },
                content: 'Message content'
            },
            message
        );

        expect(encryptor.decryptMessageContent).to.have.been.calledOnce.and.calledWith(
            message.content,
            undefined
        );
    });


    it('Should send governance message to correct channel ', async () => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = {
            on: sandbox.stub(),
            publish: sandbox.stub().callsFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            })
        };

        const messageId = uuid.v4();
        const headers = {
            taskId: 'task1234567890',
            stepId: 'step_456',
            protocolVersion: 2,
            messageId
        };

        await amqp.sendGovernanceChannel({
            headers: {
                'some-other-header': 'headerValue',
                messageId
            },
            body: 'Message content'
        }, headers);

        expect(amqp.publishChannel.publish).to.have.been.calledOnce.and.calledWith(
            settings.EVENT_BUS_EXCHANGE,
            settings.GOVERNANCE_ROUTING_KEY
        );
    });

    it('Should disconnect from all channels and connection', async () => {
        const amqp = new Amqp(settings);
        amqp.subscribeChannel = {
            close: sandbox.stub()
        };
        amqp.publishChannel = {
            close: sandbox.stub()
        };
        amqp.amqp = {
            close: sandbox.stub(),
            removeAllListeners: sandbox.stub()
        };

        await amqp.disconnect();
        expect(amqp.subscribeChannel.close).to.have.been.calledOnce;
        expect(amqp.publishChannel.close).to.have.been.calledOnce;
        expect(amqp.amqp.close).to.have.been.calledOnce;
        expect(amqp.amqp.removeAllListeners).to.have.been.calledOnce.and.calledWith('close');
    });
    describe('_getDelay', () => {
        let amqp;
        beforeEach(() => {
            amqp = new Amqp(settings);
        });
        it('should return defaultDelay * 2^^iteration as delay', () => {
            expect(amqp._getDelay(100, 300 * 1000, 0)).to.equal(100);
            expect(amqp._getDelay(100, 300 * 1000, 1)).to.equal(200);
            expect(amqp._getDelay(100, 300 * 1000, 2)).to.equal(400);
            expect(amqp._getDelay(100, 300 * 1000, 4)).to.equal(1600);
        });
        it('should return default delay for first iteration', () => {
            expect(amqp._getDelay(100, 300 * 1000, 0)).to.equal(100);
        });
        it('should reutrn maxDelay if calculated delay is greater then maxDelay', () => {
            expect(amqp._getDelay(100, 300 * 1000, 12)).to.equal(300 * 1000);
            expect(amqp._getDelay(100, 300 * 1000, 15)).to.equal(300 * 1000);
        });
        it('should reutrn maxDelay if calculated delay is infinity then maxDelay', () => {
            expect(amqp._getDelay(100, 300 * 1000, 1e6)).to.equal(300 * 1000);
        });
    });
});
