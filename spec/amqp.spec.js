describe('AMQP', () => {
    process.env.ELASTICIO_MESSAGE_CRYPTO_PASSWORD = 'testCryptoPassword';
    process.env.ELASTICIO_MESSAGE_CRYPTO_IV = 'iv=any16_symbols';

    const envVars = {};
    envVars.ELASTICIO_AMQP_URI = 'amqp://test2/test2';
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
    envVars.ELASTICIO_DATA_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:message';
    envVars.ELASTICIO_ERROR_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:error';
    envVars.ELASTICIO_REBOUND_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:rebound';
    envVars.ELASTICIO_SNAPSHOT_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:snapshot';

    envVars.ELASTICIO_API_URI = 'http://apihost.com';
    envVars.ELASTICIO_API_USERNAME = 'test@test.com';
    envVars.ELASTICIO_API_KEY = '5559edd';

    const Amqp = require('../lib/amqp.js').Amqp;
    const settings = require('../lib/settings.js').readFrom(envVars);
    const encryptor = require('../lib/encryptor.js');
    const _ = require('lodash');
    const pThrottle = require('p-throttle');

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
                reply_to: 'replyTo1234567890'
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
            clusterId: ''
        },
        content: encryptor.encryptMessageContent({ content: 'Message content' })
    };

    beforeEach(() => {
        spyOn(encryptor, 'decryptMessageContent').andCallThrough();
    });

    it('Should send message to outgoing channel when process data', done => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['on']);
        amqp.publishChannel.publish = () => true;
        spyOn(amqp.publishChannel, 'publish')
            .andCallFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            });
        const props = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                taskId: 'task1234567890',
                stepId: 'step_456'
            }
        };

        amqp.sendData({
            headers: {
                'some-other-header': 'headerValue'
            },
            body: 'Message content'
        }, props)
            .then(() => {
                expect(amqp.publishChannel.publish).toHaveBeenCalled();
                expect(amqp.publishChannel.publish.callCount).toEqual(1);

                const publishParameters = amqp.publishChannel.publish.calls[0].args;
                expect(publishParameters).toEqual([
                    settings.PUBLISH_MESSAGES_TO,
                    settings.DATA_ROUTING_KEY,
                    jasmine.any(Object),
                    props,
                    jasmine.any(Function)
                ]);
                const payload = encryptor.decryptMessageContent(publishParameters[2].toString());
                expect(payload).toEqual({
                    headers: {
                        'some-other-header': 'headerValue'
                    },
                    body: 'Message content'
                });
                done();
            }, () => done(new Error('Exception should not be thrown')));
    });

    it('Should send message async to outgoing channel when process data', done => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['on']);
        amqp.publishChannel.publish = () => true;
        spyOn(amqp.publishChannel, 'publish')
            .andCallFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            });
        const props = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                taskId: 'task1234567890',
                stepId: 'step_456'
            }
        };
        // One request every 500 ms
        const throttle = pThrottle(() => Promise.resolve(), 1, 500);
        const start = Date.now();

        async function test() {
            for (let i = 0; i < 3; i++) {
                await amqp.sendData({
                    headers: {
                        'some-other-header': 'headerValue'
                    },
                    body: 'Message content'
                }, props, throttle);
            }
        }

        test().then(() => {
            const duration = Math.round((Date.now() - start) / 1000);
            // Total duration should be around 1 seconds, because
            // first goes through
            // second throttled for 500ms
            // third throttled for another 500 ms
            expect(duration).toEqual(1);
            expect(amqp.publishChannel.publish).toHaveBeenCalled();
            expect(amqp.publishChannel.publish.callCount).toEqual(3);

            const publishParameters = amqp.publishChannel.publish.calls[0].args;
            expect(publishParameters).toEqual([
                settings.PUBLISH_MESSAGES_TO,
                settings.DATA_ROUTING_KEY,
                jasmine.any(Object),
                props,
                jasmine.any(Function)
            ]);

            const payload = encryptor.decryptMessageContent(publishParameters[2].toString());
            expect(payload).toEqual({
                headers: {
                    'some-other-header': 'headerValue'
                },
                body: 'Message content'
            });
            done();
        }, () => done(new Error('Exception should not be thrown')));
    });

    it('Should throw error when message size exceeds limit', done => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish', 'on']);

        const body = 'a'.repeat(settings.OUTGOING_MESSAGE_SIZE_LIMIT + 1);
        const headers = {};

        amqp.sendData({ body }, { headers })
            .then(() => done(new Error('Exception should not be thrown')))
            .catch(err => {
                expect(err.message).toEqual('Outgoing message size 13981056 exceeds limit of 10485760.');
                expect(amqp.publishChannel.publish).not.toHaveBeenCalled();
                done();
            });
    });

    it('Should send message to outgoing channel after 3 attempts', done => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['on']);
        amqp.publishChannel.publish = () => true;
        let iteration = 0;
        spyOn(amqp.publishChannel, 'publish')
            .andCallFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                iteration < 3 ? cb('Some error') : cb(null, 'Success');
                iteration++;
                return true;
            });

        const props = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                taskId: 'task1234567890',
                stepId: 'step_456'
            }
        };

        amqp.sendData({
            headers: {
                'some-other-header': 'headerValue'
            },
            body: 'Message content'
        }, props)
            .then(() => {
                expect(amqp.publishChannel.publish).toHaveBeenCalled();
                expect(amqp.publishChannel.publish.callCount).toEqual(4);

                const publishParameters = amqp.publishChannel.publish.calls[0].args;
                expect(publishParameters).toEqual([
                    settings.PUBLISH_MESSAGES_TO,
                    settings.DATA_ROUTING_KEY,
                    jasmine.any(Object),
                    props,
                    jasmine.any(Function)
                ]);

                const payload = encryptor.decryptMessageContent(publishParameters[2].toString());
                expect(payload).toEqual({
                    headers: {
                        'some-other-header': 'headerValue'
                    },
                    body: 'Message content'
                });
                done();
            }, () => done(new Error('Exception should not be thrown')));
    });

    it('Should throw error after 3 attempts to publish message', done => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['on']);
        amqp.publishChannel.publish = () => true;
        spyOn(amqp.publishChannel, 'publish')
            .andCallFake((exchangeName, routingKey, payloadBuffer, options, cb) => cb('Some error'));

        const props = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                taskId: 'task1234567890',
                stepId: 'step_456'
            }
        };

        amqp.sendData({
            headers: {
                'some-other-header': 'headerValue'
            },
            body: 'Message content'
        }, props)
            .then(() => done(new Error('Exception should thrown')))
            .catch(() => {
                expect(amqp.publishChannel.publish).toHaveBeenCalled();
                expect(amqp.publishChannel.publish.callCount).toEqual(10);

                const publishParameters = amqp.publishChannel.publish.calls[0].args;
                expect(publishParameters).toEqual([
                    settings.PUBLISH_MESSAGES_TO,
                    settings.DATA_ROUTING_KEY,
                    jasmine.any(Object),
                    props,
                    jasmine.any(Function)
                ]);

                const payload = encryptor.decryptMessageContent(publishParameters[2].toString());
                expect(payload).toEqual({
                    headers: {
                        'some-other-header': 'headerValue'
                    },
                    body: 'Message content'
                });
                done();
            });
    });

    it('Should sendHttpReply to outgoing channel using routing key from headers when process data', done => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['on']);
        amqp.publishChannel.publish = () => true;
        spyOn(amqp.publishChannel, 'publish')
            .andCallFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            });

        const msg = {
            statusCode: 200,
            headers: {
                'content-type': 'text/plain'
            },
            body: 'OK'
        };

        const props = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                taskId: 'task1234567890',
                stepId: 'step_456',
                reply_to: 'my-special-routing-key'
            }
        };
        amqp.sendHttpReply(msg, props)
            .then(() => {
                expect(amqp.publishChannel.publish).toHaveBeenCalled();
                expect(amqp.publishChannel.publish.callCount).toEqual(1);

                const publishParameters = amqp.publishChannel.publish.calls[0].args;
                expect(publishParameters[0]).toEqual(settings.PUBLISH_MESSAGES_TO);
                expect(publishParameters[1]).toEqual('my-special-routing-key');
                expect(publishParameters[2].toString()).toEqual(encryptor.encryptMessageContent(msg));
                expect(publishParameters[3]).toEqual(props);

                const payload = encryptor.decryptMessageContent(publishParameters[2].toString());
                expect(payload).toEqual(msg);
                done();
            }, () => done(new Error('Exception should not be thrown')));
    });

    it('Should throw error in sendHttpReply if reply_to header not found', done => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['on']);
        amqp.publishChannel.publish = () => true;
        spyOn(amqp.publishChannel, 'publish')
            .andCallFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            });

        const msg = {
            statusCode: 200,
            headers: {
                'content-type': 'text/plain'
            },
            body: 'OK'
        };

        async function test() {
            await amqp.sendHttpReply(msg, {
                contentType: 'application/json',
                contentEncoding: 'utf8',
                mandatory: true,
                headers: {
                    taskId: 'task1234567890',
                    stepId: 'step_456'
                }
            });
        }

        test().then(() => done(new Error('Exception should be thrown')), () => {
            expect(amqp.publishChannel.publish).not.toHaveBeenCalled();
            done();
        });

    });

    it('Should send message to outgoing channel using routing key from headers when process data', done => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['on']);
        amqp.publishChannel.publish = () => true;
        spyOn(amqp.publishChannel, 'publish')
            .andCallFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            });

        const msg = {
            headers: {
                'X-EIO-Routing-Key': 'my-special-routing-key'
            },
            body: {
                content: 'Message content'
            }
        };

        const props = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                taskId: 'task1234567890',
                stepId: 'step_456'
            }
        };

        amqp.sendData(msg, props)
            .then(() => {
                expect(amqp.publishChannel.publish).toHaveBeenCalled();
                expect(amqp.publishChannel.publish.callCount).toEqual(1);

                const publishParameters = amqp.publishChannel.publish.calls[0].args;
                expect(publishParameters).toEqual([
                    settings.PUBLISH_MESSAGES_TO,
                    'my-special-routing-key',
                    jasmine.any(Object),
                    props,
                    jasmine.any(Function)
                ]);

                const payload = encryptor.decryptMessageContent(publishParameters[2].toString());
                expect(payload).toEqual({
                    headers: {},
                    body: {
                        content: 'Message content'
                    }
                });
                done();
            }, () => done(new Error('Exception should not be thrown')));

    });

    it('Should send message to errors when process error', done => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['on']);
        amqp.publishChannel.publish = () => true;
        spyOn(amqp.publishChannel, 'publish')
            .andCallFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            });

        const props = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                taskId: 'task1234567890',
                stepId: 'step_456'
            }
        };

        amqp.sendError(new Error('Test error'), props, message.content)
            .then(() => {

                expect(amqp.publishChannel.publish).toHaveBeenCalled();
                expect(amqp.publishChannel.publish.callCount).toEqual(1);

                const publishParameters = amqp.publishChannel.publish.calls[0].args;
                expect(publishParameters).toEqual([
                    settings.PUBLISH_MESSAGES_TO,
                    settings.ERROR_ROUTING_KEY,
                    jasmine.any(Object),
                    props,
                    jasmine.any(Function)
                ]);

                const payload = JSON.parse(publishParameters[2].toString());
                payload.error = encryptor.decryptMessageContent(payload.error);
                payload.errorInput = encryptor.decryptMessageContent(payload.errorInput);

                expect(payload).toEqual({
                    error: {
                        name: 'Error',
                        message: 'Test error',
                        stack: jasmine.any(String)
                    },
                    errorInput: {
                        content: 'Message content'
                    }
                });
                done();
            }, () => done(new Error('Exception should not be thrown')));
    });

    it('Should send message to errors using routing key from headers when process error', done => {
        const expectedErrorPayload = {
            error: {
                name: 'Error',
                message: 'Test error',
                stack: jasmine.any(String)
            },
            errorInput: {
                content: 'Message content'
            }
        };

        const amqp = new Amqp(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['on']);
        amqp.publishChannel.publish = () => true;
        spyOn(amqp.publishChannel, 'publish')
            .andCallFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            });

        const props = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                taskId: 'task1234567890',
                stepId: 'step_456',
                reply_to: 'my-special-routing-key'
            }
        };

        amqp.sendError(new Error('Test error'), props, message.content)
            .then(() => {
                expect(amqp.publishChannel.publish).toHaveBeenCalled();
                expect(amqp.publishChannel.publish.callCount).toEqual(2);

                let publishParameters = amqp.publishChannel.publish.calls[0].args;
                expect(publishParameters.length).toEqual(5);
                expect(publishParameters[0]).toEqual(settings.PUBLISH_MESSAGES_TO);
                expect(publishParameters[1]).toEqual('5559edd38968ec0736000003:step_1:1432205514864:error');
                expect(publishParameters[3]).toEqual(props);

                let payload = JSON.parse(publishParameters[2].toString());
                payload.error = encryptor.decryptMessageContent(payload.error);
                payload.errorInput = encryptor.decryptMessageContent(payload.errorInput);

                expect(payload).toEqual(expectedErrorPayload);


                publishParameters = amqp.publishChannel.publish.calls[1].args;
                expect(publishParameters.length).toEqual(5);
                expect(publishParameters[0]).toEqual(settings.PUBLISH_MESSAGES_TO);
                expect(publishParameters[1]).toEqual('my-special-routing-key');
                expect(publishParameters[3]).toEqual({
                    contentType: 'application/json',
                    contentEncoding: 'utf8',
                    mandatory: true,
                    headers: {
                        'taskId': 'task1234567890',
                        'stepId': 'step_456',
                        'reply_to': 'my-special-routing-key',
                        'x-eio-error-response': true
                    }
                });

                payload = encryptor.decryptMessageContent(publishParameters[2].toString());

                expect(payload).toEqual(expectedErrorPayload.error);
                done();
            }, () => done(new Error('Exception should not be thrown')));
    });

    it('Should not provide errorInput if errorInput was empty', done => {
        const amqp = new Amqp(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['on']);
        amqp.publishChannel.publish = () => true;
        spyOn(amqp.publishChannel, 'publish')
            .andCallFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            });

        const props = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                taskId: 'task1234567890',
                stepId: 'step_456'
            }
        };

        amqp.sendError(new Error('Test error'), props, '')
            .then(() => {
                expect(amqp.publishChannel.publish).toHaveBeenCalled();
                expect(amqp.publishChannel.publish.callCount).toEqual(1);

                const publishParameters = amqp.publishChannel.publish.calls[0].args;
                expect(publishParameters[0]).toEqual(settings.PUBLISH_MESSAGES_TO);
                expect(publishParameters[1]).toEqual('5559edd38968ec0736000003:step_1:1432205514864:error');

                const payload = JSON.parse(publishParameters[2].toString());
                payload.error = encryptor.decryptMessageContent(payload.error);

                expect(payload).toEqual({
                    error: {
                        name: 'Error',
                        message: 'Test error',
                        stack: jasmine.any(String)
                    }
                    // no errorInput should be here
                });

                expect(publishParameters[3]).toEqual(props);
                done();
            }, () => done(new Error('Exception should not be thrown')));
    });

    it('Should not provide errorInput if errorInput was null', done => {

        const amqp = new Amqp(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['on']);
        amqp.publishChannel.publish = () => true;
        spyOn(amqp.publishChannel, 'publish')
            .andCallFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            });

        const props = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                taskId: 'task1234567890',
                stepId: 'step_456'
            }
        };

        amqp.sendError(new Error('Test error'), props, null)
            .then(() => {
                expect(amqp.publishChannel.publish).toHaveBeenCalled();
                expect(amqp.publishChannel.publish.callCount).toEqual(1);

                const publishParameters = amqp.publishChannel.publish.calls[0].args;

                expect(publishParameters[0]).toEqual(settings.PUBLISH_MESSAGES_TO);
                expect(publishParameters[1]).toEqual('5559edd38968ec0736000003:step_1:1432205514864:error');

                const payload = JSON.parse(publishParameters[2].toString());
                payload.error = encryptor.decryptMessageContent(payload.error);

                expect(payload).toEqual({
                    error: {
                        name: 'Error',
                        message: 'Test error',
                        stack: jasmine.any(String)
                    }
                    // no errorInput should be here
                });
                expect(publishParameters[3]).toEqual(props);
                done();
            }, () => done(new Error('Exception should not be thrown')));
    });

    it('Should send message to rebounds when rebound happened', done => {

        const amqp = new Amqp(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['on']);
        amqp.publishChannel.publish = () => true;
        spyOn(amqp.publishChannel, 'publish')
            .andCallFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            });

        const props = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                execId: 'exec1234567890',
                taskId: 'task1234567890',
                stepId: 'step_1',
                compId: 'comp1',
                function: 'list',
                start: '1432815685034'
            }
        };

        amqp.sendRebound(new Error('Rebound error'), message, props)
            .then(() => {
                expect(amqp.publishChannel.publish).toHaveBeenCalled();
                expect(amqp.publishChannel.publish.callCount).toEqual(1);

                const publishParameters = amqp.publishChannel.publish.calls[0].args;
                expect(publishParameters).toEqual([
                    settings.PUBLISH_MESSAGES_TO,
                    settings.REBOUND_ROUTING_KEY,
                    jasmine.any(Object),
                    {
                        contentType: 'application/json',
                        contentEncoding: 'utf8',
                        mandatory: true,
                        expiration: 15000,
                        headers: {
                            execId: 'exec1234567890',
                            taskId: 'task1234567890',
                            stepId: 'step_1',
                            compId: 'comp1',
                            function: 'list',
                            start: '1432815685034',
                            reboundIteration: 1
                        }
                    },
                    jasmine.any(Function)
                ]);

                const payload = encryptor.decryptMessageContent(publishParameters[2].toString());
                expect(payload).toEqual({ content: 'Message content' });
                done();
            }, () => done(new Error('Exception should not be thrown')));

    });

    it('Should send message to rebounds with reboundIteration=3', done => {

        const amqp = new Amqp(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['on']);
        amqp.publishChannel.publish = () => true;
        spyOn(amqp.publishChannel, 'publish')
            .andCallFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            });

        const props = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                execId: 'exec1234567890',
                taskId: 'task1234567890',
                stepId: 'step_1',
                compId: 'comp1',
                function: 'list',
                start: '1432815685034'
            }
        };

        const clonedMessage = _.cloneDeep(message);
        clonedMessage.properties.headers.reboundIteration = 2;

        amqp.sendRebound(new Error('Rebound error'), clonedMessage, props)
            .then(() => {
                expect(amqp.publishChannel.publish).toHaveBeenCalled();
                expect(amqp.publishChannel.publish.callCount).toEqual(1);

                const publishParameters = amqp.publishChannel.publish.calls[0].args;
                expect(publishParameters).toEqual([
                    settings.PUBLISH_MESSAGES_TO,
                    settings.REBOUND_ROUTING_KEY,
                    jasmine.any(Object),
                    {
                        contentType: 'application/json',
                        contentEncoding: 'utf8',
                        mandatory: true,
                        expiration: 60000,
                        headers: {
                            execId: 'exec1234567890',
                            taskId: 'task1234567890',
                            stepId: 'step_1',
                            compId: 'comp1',
                            function: 'list',
                            start: '1432815685034',
                            reboundIteration: 3
                        }
                    },
                    jasmine.any(Function)
                ]);

                const payload = encryptor.decryptMessageContent(publishParameters[2].toString());
                expect(payload).toEqual({ content: 'Message content' });
                done();
            }, () => done(new Error('Exception should not be thrown')));
    });

    it('Should send message to errors when rebound limit exceeded', done => {

        const amqp = new Amqp(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['on']);
        amqp.publishChannel.publish = () => true;
        spyOn(amqp.publishChannel, 'publish')
            .andCallFake((exchangeName, routingKey, payloadBuffer, options, cb) => {
                cb(null, 'Success');
                return true;
            });

        const props = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                execId: 'exec1234567890',
                taskId: 'task1234567890',
                stepId: 'step_1',
                compId: 'comp1',
                function: 'list',
                start: '1432815685034'
            }
        };

        const clonedMessage = _.cloneDeep(message);
        clonedMessage.properties.headers.reboundIteration = 100;

        amqp.sendRebound(new Error('Rebound error'), clonedMessage, props)
            .then(() => {
                expect(amqp.publishChannel.publish).toHaveBeenCalled();
                expect(amqp.publishChannel.publish.callCount).toEqual(1);

                const publishParameters = amqp.publishChannel.publish.calls[0].args;
                expect(publishParameters).toEqual([
                    settings.PUBLISH_MESSAGES_TO,
                    settings.ERROR_ROUTING_KEY,
                    jasmine.any(Object),
                    props,
                    jasmine.any(Function)
                ]);

                const payload = JSON.parse(publishParameters[2].toString());
                payload.error = encryptor.decryptMessageContent(payload.error);
                payload.errorInput = encryptor.decryptMessageContent(payload.errorInput);

                expect(payload.error.message).toEqual('Rebound limit exceeded');
                expect(payload.errorInput).toEqual({ content: 'Message content' });
                done();
            }, () => done(new Error('Exception should not be thrown')));


    });

    it('Should ack message when confirmed', () => {

        const amqp = new Amqp();
        amqp.subscribeChannel = jasmine.createSpyObj('subscribeChannel', ['ack']);

        amqp.ack(message);

        expect(amqp.subscribeChannel.ack).toHaveBeenCalled();
        expect(amqp.subscribeChannel.ack.callCount).toEqual(1);
        expect(amqp.subscribeChannel.ack.calls[0].args[0]).toEqual(message);
    });

    it('Should reject message when ack is called with false', () => {

        const amqp = new Amqp(settings);
        amqp.subscribeChannel = jasmine.createSpyObj('subscribeChannel', ['reject']);
        amqp.reject(message);

        expect(amqp.subscribeChannel.reject).toHaveBeenCalled();
        expect(amqp.subscribeChannel.reject.callCount).toEqual(1);
        expect(amqp.subscribeChannel.reject.calls[0].args[0]).toEqual(message);
        expect(amqp.subscribeChannel.reject.calls[0].args[1]).toEqual(false);
    });

    it('Should listen queue and pass decrypted message to client function', () => {

        const amqp = new Amqp(settings);
        const clientFunction = jasmine.createSpy('clientFunction');
        amqp.subscribeChannel = jasmine.createSpyObj('subscribeChannel', ['consume', 'prefetch']);
        amqp.subscribeChannel.consume.andCallFake((queueName, callback) => {
            callback(message);
        });

        runs(() => {
            amqp.listenQueue('testQueue', clientFunction);
        });

        waitsFor(() => clientFunction.callCount > 0);

        runs(() => {
            expect(amqp.subscribeChannel.prefetch).toHaveBeenCalledWith(1);
            expect(clientFunction.callCount).toEqual(1);
            expect(clientFunction.calls[0].args[0]).toEqual(
                {
                    headers: {
                        reply_to: 'replyTo1234567890'
                    },
                    content: 'Message content'
                }
            );
            expect(clientFunction.calls[0].args[1]).toEqual(message);
            //eslint-disable-next-line max-len
            expect(clientFunction.calls[0].args[1].content).toEqual(encryptor.encryptMessageContent({ content: 'Message content' }));

            expect(encryptor.decryptMessageContent).toHaveBeenCalledWith(message.content, message.properties.headers);
        });
    });

    it('Should disconnect from all channels and connection', () => {

        const amqp = new Amqp(settings);
        amqp.subscribeChannel = jasmine.createSpyObj('subscribeChannel', ['close']);
        amqp.publishChannel = jasmine.createSpyObj('subscribeChannel', ['close']);
        amqp.amqp = jasmine.createSpyObj('amqp', ['close']);

        amqp.disconnect();

        expect(amqp.subscribeChannel.close.callCount).toEqual(1);
        expect(amqp.publishChannel.close.callCount).toEqual(1);
        expect(amqp.amqp.close.callCount).toEqual(1);
    });

});
