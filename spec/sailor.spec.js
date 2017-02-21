describe('Sailor', function () {
    const envVars = {};
    envVars.ELASTICIO_AMQP_URI = 'amqp://test2/test2';
    envVars.ELASTICIO_FLOW_ID = '5559edd38968ec0736000003';
    envVars.ELASTICIO_STEP_ID = 'step_1';
    envVars.ELASTICIO_EXEC_ID = 'some-exec-id';

    envVars.ELASTICIO_USER_ID = '5559edd38968ec0736000002';
    envVars.ELASTICIO_COMP_ID = '5559edd38968ec0736000456';
    envVars.ELASTICIO_FUNCTION = 'list';

    envVars.ELASTICIO_LISTEN_MESSAGES_ON = '5559edd38968ec0736000003:step_1:1432205514864:messages';
    envVars.ELASTICIO_PUBLISH_MESSAGES_TO = 'userexchange:5527f0ea43238e5d5f000001';
    envVars.ELASTICIO_DATA_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:message';
    envVars.ELASTICIO_ERROR_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:error';
    envVars.ELASTICIO_REBOUND_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:rebound';
    envVars.ELASTICIO_SNAPSHOT_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:snapshot';

    envVars.ELASTICIO_COMPONENT_PATH='/spec/component';
    envVars.ELASTICIO_DEBUG='sailor';

    envVars.ELASTICIO_API_URI = 'http://apihost.com';
    envVars.ELASTICIO_API_USERNAME = 'test@test.com';
    envVars.ELASTICIO_API_KEY = '5559edd';

    process.env.ELASTICIO_TIMEOUT = 3000;

    const amqp = require('../lib/amqp.js');
    var settings;
    const encryptor = require('../lib/encryptor.js');
    const Sailor = require('../lib/sailor.js').Sailor;
    const _ = require('lodash');
    const Q = require('q');

    const payload = {param1: "Value1"};

    const message = {
        fields: {
            consumerTag: "abcde",
            deliveryTag: 12345,
            exchange: 'test',
            routingKey: 'test.hello'
        },
        properties: {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            headers: {
                taskId: "5559edd38968ec0736000003",
                execId: "exec1",
                userId: "5559edd38968ec0736000002"
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
        content: new Buffer(encryptor.encryptMessageContent(payload))
    };

    beforeEach(function(){
        settings = require('../lib/settings').readFrom(envVars);
    });

    describe('init', function() {

        it('should init properly if developer returned a plain string in init', function(done) {
            settings.FUNCTION = 'init_trigger_returns_string';

            var sailor = new Sailor(settings);

            spyOn(sailor.apiClient.tasks, 'retrieveStep').andCallFake((taskId, stepId) => {
                expect(taskId).toEqual('5559edd38968ec0736000003');
                expect(stepId).toEqual('step_1');
                return Promise.resolve({
                    config: {
                        _account: '1234567890'
                    }
                });
            });

            sailor.prepare()
                .then(() => sailor.init({}))
                .then((result) =>{
                    expect(result).toEqual('this_is_a_string');
                    done();
                })
                .catch(done);
        });
        it('should init properly if developer returned a promise', function(done) {
            settings.FUNCTION = 'init_trigger';

            var sailor = new Sailor(settings);

            spyOn(sailor.apiClient.tasks, 'retrieveStep').andCallFake((taskId, stepId) => {
                expect(taskId).toEqual('5559edd38968ec0736000003');
                expect(stepId).toEqual('step_1');
                return Promise.resolve({
                    config: {
                        _account: '1234567890'
                    }
                });
            });

            sailor.prepare()
                .then(() => sailor.init({}))
                .then((result) =>{
                    expect(result).toEqual({
                        subscriptionId : '_subscription_123'
                    });
                    done();
                })
                .catch(done);
        });
    });

    describe('prepare', function() {

        it('should fail if unable to retrieve step info', function(done) {
            var sailor = new Sailor(settings);

            spyOn(sailor.apiClient.tasks, 'retrieveStep').andCallFake(function(taskId, stepId) {
                expect(taskId).toEqual('5559edd38968ec0736000003');
                expect(stepId).toEqual('step_1');
                return Q.reject(new Error('Cant find step info'));
            });

            sailor.prepare()
                .then(function() {
                    throw new Error('Error is expected');
                })
                .catch(function(err) {
                    expect(err.message).toEqual('Cant find step info');
                    done();
                });
        });
    });

    describe('disconnection', function() {
        it('should disconnect Mongo and RabbitMQ, and exit process', function (done) {
            var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", ['disconnect']);
            fakeAMQPConnection.disconnect.andReturn(Q.resolve());

            spyOn(amqp, "AMQPConnection").andReturn(fakeAMQPConnection);
            spyOn(process, "exit").andReturn(0);

            var sailor = new Sailor(settings);

            sailor.disconnect()
                .then(function(){
                    expect(fakeAMQPConnection.disconnect).toHaveBeenCalled();
                    done();
                })
                .catch(done);
        });
    });

    describe('processMessage', function () {
        var fakeAMQPConnection;

        beforeEach(function(){
            fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", [
                'connect','sendData','sendError','sendRebound','ack','reject',
                'sendSnapshot', 'sendHttpReply'
            ]);

            spyOn(amqp, "AMQPConnection").andReturn(fakeAMQPConnection);
        });

        it('should call sendData() and ack() if success', function (done) {
            settings.FUNCTION = 'data_trigger';
            var sailor = new Sailor(settings);

            spyOn(sailor.apiClient.tasks, 'retrieveStep').andCallFake(function(taskId, stepId) {
                expect(taskId).toEqual('5559edd38968ec0736000003');
                expect(stepId).toEqual('step_1');
                return Q({});
            });

            sailor.connect()
                .then(() => sailor.prepare())
                .then(() => sailor.processMessage(payload, message))
                .then(() => {
                    expect(sailor.apiClient.tasks.retrieveStep).toHaveBeenCalled();
                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();
                    expect(fakeAMQPConnection.sendData).toHaveBeenCalled();

                    var sendDataCalls = fakeAMQPConnection.sendData.calls;

                    expect(sendDataCalls[0].args[0]).toEqual({items: [1,2,3,4,5,6]});
                    expect(sendDataCalls[0].args[1]).toEqual(jasmine.any(Object));
                    expect(sendDataCalls[0].args[1]).toEqual({
                        contentType: 'application/json',
                        contentEncoding: 'utf8',
                        mandatory: true,
                        headers: {
                            execId: 'exec1',
                            taskId: '5559edd38968ec0736000003',
                            userId: '5559edd38968ec0736000002',
                            stepId: 'step_1',
                            compId: '5559edd38968ec0736000456',
                            function: 'data_trigger',
                            start: jasmine.any(Number),
                            cid: 1,
                            end: jasmine.any(Number),
                            messageId: jasmine.any(String)
                        }
                    });

                    expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                    expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                    expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
                    done();
                })
                .catch(done); //todo: use done.fail after migration to Jasmine 2.x
        });

        it('should send request to API server to update keys', function (done) {
            settings.FUNCTION = 'keys_trigger';
            var sailor = new Sailor(settings);

            spyOn(sailor.apiClient.tasks, 'retrieveStep').andCallFake(function(taskId, stepId) {
                expect(taskId).toEqual('5559edd38968ec0736000003');
                expect(stepId).toEqual('step_1');
                return Q({
                    config: {
                        _account: '1234567890'
                    }
                });
            });

            spyOn(sailor.apiClient.accounts, 'update').andCallFake(function(accountId, keys) {
                expect(accountId).toEqual('1234567890');
                expect(keys).toEqual({keys: {oauth: {access_token: 'newAccessToken'}}});
                return Q();
            });

            sailor.prepare()
                .then(() => sailor.connect())
                .then(() => sailor.processMessage(payload, message))
                .then(() => {
                    expect(sailor.apiClient.tasks.retrieveStep).toHaveBeenCalled();
                    expect(sailor.apiClient.accounts.update).toHaveBeenCalled();

                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();
                    expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                    expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                    expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
                    done();
                })
                .catch(done); //todo: use done.fail after migration to Jasmine 2.x
        });

        it('should emit error if failed to update keys', function (done) {
            settings.FUNCTION = 'keys_trigger';
            var sailor = new Sailor(settings);

            spyOn(sailor.apiClient.tasks, 'retrieveStep').andCallFake(function(taskId, stepId) {
                expect(taskId).toEqual('5559edd38968ec0736000003');
                expect(stepId).toEqual('step_1');
                return Q({
                    config: {
                        _account: '1234567890'
                    }
                });
            });

            spyOn(sailor.apiClient.accounts, 'update').andCallFake(function(accountId, keys) {
                expect(accountId).toEqual('1234567890');
                expect(keys).toEqual({keys: {oauth: {access_token: 'newAccessToken'}}});
                return Q.reject(new Error('Update keys error'));
            });

            sailor.prepare()
                .then(() => sailor.connect())
                .then(() => sailor.processMessage(payload, message))
                .then(() => {
                    expect(sailor.apiClient.tasks.retrieveStep).toHaveBeenCalled();
                    expect(sailor.apiClient.accounts.update).toHaveBeenCalled();

                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();
                    expect(fakeAMQPConnection.sendError).toHaveBeenCalled();
                    expect(fakeAMQPConnection.sendError.calls[0].args[0].message).toEqual('Update keys error');
                    expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                    expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                    expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
                    done();
                })
                .catch(done);
        });

        it('should call sendRebound() and ack()', function (done) {
            settings.FUNCTION = 'rebound_trigger';
            var sailor = new Sailor(settings);

            spyOn(sailor.apiClient.tasks, 'retrieveStep').andCallFake(function(taskId, stepId) {
                expect(taskId).toEqual('5559edd38968ec0736000003');
                expect(stepId).toEqual('step_1');
                return Q({});
            });

            sailor.prepare()
                .then(() => sailor.connect())
                .then(() => sailor.processMessage(payload, message))
                .then(() => {
                    expect(sailor.apiClient.tasks.retrieveStep).toHaveBeenCalled();

                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                    expect(fakeAMQPConnection.sendRebound).toHaveBeenCalled();
                    expect(fakeAMQPConnection.sendRebound.calls[0].args[0].message).toEqual('Rebound reason');
                    expect(fakeAMQPConnection.sendRebound.calls[0].args[1]).toEqual(message);

                    expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                    expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                    expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
                    done();
                })
                .catch(done);
        });

        it('should call sendSnapshot() and ack() after a `snapshot` event', function (done) {
            settings.FUNCTION = 'update';
            var sailor = new Sailor(settings);

            spyOn(sailor.apiClient.tasks, 'retrieveStep').andCallFake(function(taskId, stepId) {
                expect(taskId).toEqual('5559edd38968ec0736000003');
                expect(stepId).toEqual('step_1');
                return Q({});
            });

            sailor.prepare()
                .then(() => sailor.connect())
                .then(() => {
                    const payload = {
                        snapshot : {blabla : 'blablabla'}
                    };
                    return sailor.processMessage(payload, message);
                })
                .then(() => {
                    expect(sailor.apiClient.tasks.retrieveStep).toHaveBeenCalled();

                    var expectedSnapshot = {blabla:'blablabla'};
                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                    expect(fakeAMQPConnection.sendSnapshot.callCount).toBe(1);
                    expect(fakeAMQPConnection.sendSnapshot.calls[0].args[0]).toEqual(expectedSnapshot);
                    expect(fakeAMQPConnection.sendSnapshot.calls[0].args[1]).toEqual({
                        contentType : 'application/json',
                        contentEncoding : 'utf8',
                        mandatory : true,
                        headers : {
                            taskId: '5559edd38968ec0736000003',
                            execId: 'exec1',
                            userId : '5559edd38968ec0736000002',
                            stepId: 'step_1',
                            compId : '5559edd38968ec0736000456',
                            function : 'update',
                            start: jasmine.any(Number),
                            cid: 1,
                            snapshotEvent : 'snapshot',
                            messageId: jasmine.any(String)
                        }
                    });
                    expect(sailor.snapshot).toEqual(expectedSnapshot);
                    expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                    expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                    expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
                    done();
                })
                .catch(done);
        });

        it('should call sendSnapshot() and ack() after an `updateSnapshot` event', function (done) {
            settings.FUNCTION = 'update';
            var sailor = new Sailor(settings);

            spyOn(sailor.apiClient.tasks, 'retrieveStep').andCallFake(function(taskId, stepId) {
                expect(taskId).toEqual('5559edd38968ec0736000003');
                expect(stepId).toEqual('step_1');
                return Q({
                    snapshot: {
                        someId: 'someData'
                    }
                });
            });

            sailor.prepare()
                .then(() => sailor.connect())
                .then(() => {
                    const payload = {
                        updateSnapshot : {updated : 'value'}
                    };
                    return sailor.processMessage(payload, message);
                })
                .then(function() {
                    expect(sailor.apiClient.tasks.retrieveStep).toHaveBeenCalled();

                    var expectedSnapshot = {someId: 'someData', updated: 'value'};
                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                    expect(fakeAMQPConnection.sendSnapshot.callCount).toBe(1);
                    expect(fakeAMQPConnection.sendSnapshot.calls[0].args[0]).toEqual({updated: 'value'});
                    expect(fakeAMQPConnection.sendSnapshot.calls[0].args[1]).toEqual({
                        contentType : 'application/json',
                        contentEncoding : 'utf8',
                        mandatory : true,
                        headers : {
                            taskId: '5559edd38968ec0736000003',
                            execId: 'exec1',
                            userId : '5559edd38968ec0736000002',
                            stepId: 'step_1',
                            compId : '5559edd38968ec0736000456',
                            function : 'update',
                            start: jasmine.any(Number),
                            cid: 1,
                            snapshotEvent : 'updateSnapshot',
                            messageId: jasmine.any(String)
                        }
                    });
                    expect(sailor.snapshot).toEqual(expectedSnapshot);
                    expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                    expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                    expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
                    done();
                })
                .catch(done);
        });

        it('should send error if error happened', function (done) {
            settings.FUNCTION = 'error_trigger';
            var sailor = new Sailor(settings);

            spyOn(sailor.apiClient.tasks, 'retrieveStep').andCallFake(function(taskId, stepId) {
                expect(taskId).toEqual('5559edd38968ec0736000003');
                expect(stepId).toEqual('step_1');
                return Q({});
            });

            sailor.prepare()
                .then(() => sailor.connect())
                .then(() => sailor.processMessage(payload, message))
                .then(() => {
                    expect(sailor.apiClient.tasks.retrieveStep).toHaveBeenCalled();

                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                    expect(fakeAMQPConnection.sendError).toHaveBeenCalled();
                    expect(fakeAMQPConnection.sendError.calls[0].args[0].message).toEqual('Some component error');
                    expect(fakeAMQPConnection.sendError.calls[0].args[0].stack).not.toBeUndefined();
                    expect(fakeAMQPConnection.sendError.calls[0].args[2]).toEqual(message.content);

                    expect(fakeAMQPConnection.reject).toHaveBeenCalled();
                    expect(fakeAMQPConnection.reject.callCount).toEqual(1);
                    expect(fakeAMQPConnection.reject.calls[0].args[0]).toEqual(message);
                    done();
                })
                .catch(done);
        });

        it('should reject message if trigger is missing', function (done) {
            settings.FUNCTION = 'missing_trigger';
            var sailor = new Sailor(settings);

            spyOn(sailor.apiClient.tasks, 'retrieveStep').andCallFake(function(taskId, stepId) {
                expect(taskId).toEqual('5559edd38968ec0736000003');
                expect(stepId).toEqual('step_1');
                return Q({});
            });

            sailor.prepare()
                .then(() => sailor.connect())
                .then(() => sailor.processMessage(payload, message))
                .then(() => {
                    expect(sailor.apiClient.tasks.retrieveStep).toHaveBeenCalled();

                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                    expect(fakeAMQPConnection.sendError).toHaveBeenCalled();
                    expect(fakeAMQPConnection.sendError.calls[0].args[0].message).toMatch(
                        /Failed to load file \'.\/triggers\/missing_trigger.js\': Cannot find module.+missing_trigger\.js/
                    );
                    expect(fakeAMQPConnection.sendError.calls[0].args[0].stack).not.toBeUndefined();
                    expect(fakeAMQPConnection.sendError.calls[0].args[2]).toEqual(message.content);

                    expect(fakeAMQPConnection.reject).toHaveBeenCalled();
                    expect(fakeAMQPConnection.reject.callCount).toEqual(1);
                    expect(fakeAMQPConnection.reject.calls[0].args[0]).toEqual(message);
                    done()
                })
                .catch(done);
        });

        it('should not process message if taskId in header is not equal to task._id', function (done) {

            var message2 = _.cloneDeep(message);
            message2.properties.headers.taskId = "othertaskid";

            settings.FUNCTION = 'error_trigger';
            var sailor = new Sailor(settings);

            spyOn(sailor.apiClient.tasks, 'retrieveStep').andCallFake(function(taskId, stepId) {
                expect(taskId).toEqual('5559edd38968ec0736000003');
                expect(stepId).toEqual('step_1');
                return Q({});
            });

            sailor.prepare()
                .then(() => sailor.connect())
                .then(() => sailor.processMessage(payload, message2))
                .then(() => {
                    expect(sailor.apiClient.tasks.retrieveStep).toHaveBeenCalled();
                    expect(fakeAMQPConnection.reject).toHaveBeenCalled();
                    done();
                })
                .catch(done);
        });

        it('should catch all data calls and all error calls', function (done) {
            settings.FUNCTION = 'datas_and_errors';
            var sailor = new Sailor(settings);

            spyOn(sailor.apiClient.tasks, 'retrieveStep').andCallFake(function(taskId, stepId) {
                expect(taskId).toEqual('5559edd38968ec0736000003');
                expect(stepId).toEqual('step_1');
                return Q({});
            });

            sailor.prepare()
                .then(() => sailor.connect())
                .then(() => sailor.processMessage(payload, message))
                .then(() => {
                    expect(sailor.apiClient.tasks.retrieveStep).toHaveBeenCalled();

                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                    // data
                    expect(fakeAMQPConnection.sendData).toHaveBeenCalled();
                    expect(fakeAMQPConnection.sendData.calls.length).toEqual(3);

                    // error
                    expect(fakeAMQPConnection.sendError).toHaveBeenCalled();
                    expect(fakeAMQPConnection.sendError.calls.length).toEqual(2);

                    // ack
                    expect(fakeAMQPConnection.reject).toHaveBeenCalled();
                    expect(fakeAMQPConnection.reject.callCount).toEqual(1);
                    expect(fakeAMQPConnection.reject.calls[0].args[0]).toEqual(message);
                    done();
                })
                .catch(done);
        });

        it('should handle errors in httpReply properly', function (done) {
            settings.FUNCTION = 'http_reply';
            const sailor = new Sailor(settings);

            spyOn(sailor.apiClient.tasks, 'retrieveStep').andCallFake((taskId, stepId) => Promise.resolve({}));

            sailor.connect()
                .then(() => sailor.prepare())
                .then(() => sailor.processMessage(payload, message))
                .then(() => {
                    expect(sailor.apiClient.tasks.retrieveStep)
                        .toHaveBeenCalledWith('5559edd38968ec0736000003', 'step_1');

                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();
                    expect(fakeAMQPConnection.sendHttpReply).toHaveBeenCalled();

                    const sendHttpReplyCalls = fakeAMQPConnection.sendHttpReply.calls;

                    expect(sendHttpReplyCalls[0].args[0]).toEqual({
                        statusCode: 200,
                        body: 'Ok',
                        headers: {
                            'content-type': 'text/plain'
                        }
                    });
                    expect(sendHttpReplyCalls[0].args[1]).toEqual(jasmine.any(Object));
                    expect(sendHttpReplyCalls[0].args[1]).toEqual({
                        contentType : 'application/json',
                        contentEncoding : 'utf8',
                        mandatory : true,
                        headers : {
                            execId: 'exec1',
                            taskId: '5559edd38968ec0736000003',
                            userId: '5559edd38968ec0736000002',
                            stepId: 'step_1',
                            compId: '5559edd38968ec0736000456',
                            function: 'http_reply',
                            start: jasmine.any(Number),
                            cid: 1,
                            messageId: jasmine.any(String)
                        }
                    });

                    expect(fakeAMQPConnection.sendData).toHaveBeenCalled();

                    const sendDataCalls = fakeAMQPConnection.sendData.calls;

                    expect(sendDataCalls[0].args[0]).toEqual({
                        body: {}
                    });
                    expect(sendDataCalls[0].args[1]).toEqual(jasmine.any(Object));
                    expect(sendDataCalls[0].args[1]).toEqual({
                        contentType : 'application/json',
                        contentEncoding : 'utf8',
                        mandatory : true,
                        headers : {
                            execId: 'exec1',
                            taskId: '5559edd38968ec0736000003',
                            userId: '5559edd38968ec0736000002',
                            stepId: 'step_1',
                            compId: '5559edd38968ec0736000456',
                            function: 'http_reply',
                            start: jasmine.any(Number),
                            cid: 1,
                            end: jasmine.any(Number),
                            messageId: jasmine.any(String)
                        }
                    });

                    expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                    expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                    expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);

                    done();
                })
                .catch(done); //todo: use done.fail after migration to Jasmine 2.x
        });

        it('should handle errors in httpReply properly', function (done) {
            settings.FUNCTION = 'http_reply';
            const sailor = new Sailor(settings);

            spyOn(sailor.apiClient.tasks, 'retrieveStep').andCallFake((taskId, stepId) => Promise.resolve({}));

            fakeAMQPConnection.sendHttpReply.andCallFake(() => {
                throw new Error('Failed to send HTTP reply');
            });

            sailor.connect()
                .then(() => sailor.prepare())
                .then(() => sailor.processMessage(payload, message))
                .then(() => {
                    expect(sailor.apiClient.tasks.retrieveStep)
                        .toHaveBeenCalledWith('5559edd38968ec0736000003', 'step_1');

                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();
                    expect(fakeAMQPConnection.sendHttpReply).toHaveBeenCalled();

                    const sendHttpReplyCalls = fakeAMQPConnection.sendHttpReply.calls;

                    expect(sendHttpReplyCalls[0].args[0]).toEqual({
                        statusCode: 200,
                        body: 'Ok',
                        headers: {
                            'content-type': 'text/plain'
                        }
                    });
                    expect(sendHttpReplyCalls[0].args[1]).toEqual(jasmine.any(Object));
                    expect(sendHttpReplyCalls[0].args[1]).toEqual({
                        contentType : 'application/json',
                        contentEncoding : 'utf8',
                        mandatory : true,
                        headers : {
                            execId: 'exec1',
                            taskId: '5559edd38968ec0736000003',
                            userId: '5559edd38968ec0736000002',
                            stepId: 'step_1',
                            compId: '5559edd38968ec0736000456',
                            function: 'http_reply',
                            start: jasmine.any(Number),
                            cid: 1,
                            messageId: jasmine.any(String)
                        }
                    });

                    expect(fakeAMQPConnection.sendData).not.toHaveBeenCalled();
                    expect(fakeAMQPConnection.ack).not.toHaveBeenCalled();

                    // error
                    expect(fakeAMQPConnection.sendError).toHaveBeenCalled();

                    const sendErrorCalls = fakeAMQPConnection.sendError.calls;
                    expect(sendErrorCalls[0].args[0].message).toEqual('Failed to send HTTP reply');

                    // ack
                    expect(fakeAMQPConnection.reject).toHaveBeenCalled();
                    expect(fakeAMQPConnection.reject.callCount).toEqual(1);
                    expect(fakeAMQPConnection.reject.calls[0].args[0]).toEqual(message);

                    done();
                })
                .catch(done); //todo: use done.fail after migration to Jasmine 2.x
        });
    });

    describe('readIncomingMessageHeaders', () => {

        it('execId missing', () => {
            const sailor = new Sailor(settings);

            try {
                sailor.readIncomingMessageHeaders({
                    properties: {
                        headers: {}
                    }
                });
                throw new Error('Must not be reached');
            } catch(e) {
                expect(e.message).toEqual('ExecId is missing in message header');
            }
        });

        it('taskId missing', () => {
            const sailor = new Sailor(settings);

            try {
                sailor.readIncomingMessageHeaders({
                    properties: {
                        headers: {
                            execId: 'my_exec_123'
                        }
                    }
                });
                throw new Error('Must not be reached');
            } catch(e) {
                expect(e.message).toEqual('TaskId is missing in message header');
            }
        });

        it('userId missing', () => {
            const sailor = new Sailor(settings);

            try {
                sailor.readIncomingMessageHeaders({
                    properties: {
                        headers: {
                            execId: 'my_exec_123',
                            taskId: 'my_task_123'
                        }
                    }
                });
                throw new Error('Must not be reached');
            } catch(e) {
                expect(e.message).toEqual('UserId is missing in message header');
            }
        });

        it('Message with wrong taskID arrived to the sailor', () => {
            const sailor = new Sailor(settings);

            try {
                sailor.readIncomingMessageHeaders({
                    properties: {
                        headers: {
                            execId: 'my_exec_123',
                            taskId: 'my_task_123',
                            userId: 'my_user_123'
                        }
                    }
                });
                throw new Error('Must not be reached');
            } catch(e) {
                expect(e.message).toEqual('Message with wrong taskID arrived to the sailor');
            }
        });

        it('should copy standard headers', () => {
            const sailor = new Sailor(settings);

            const headers = {
                execId: 'my_exec_123',
                taskId: settings.FLOW_ID,
                userId: 'my_user_123'
            };

            const result = sailor.readIncomingMessageHeaders({
                properties: {
                    headers
                }
            });

            expect(result).toEqual(headers);
        });

        it('should copy standard headers and parentMessageId', () => {
            const sailor = new Sailor(settings);

            const messageId = 'parent_message_1234';

            const headers = {
                execId: 'my_exec_123',
                taskId: settings.FLOW_ID,
                userId: 'my_user_123',
                messageId
            };

            const result = sailor.readIncomingMessageHeaders({
                properties: {
                    headers
                }
            });

            expect(result).toEqual({
                execId: 'my_exec_123',
                taskId: settings.FLOW_ID,
                userId: 'my_user_123',
                parentMessageId: messageId
            });
        });

        it('should copy standard headers and reply_to', () => {
            const sailor = new Sailor(settings);

            const headers = {
                execId: 'my_exec_123',
                taskId: settings.FLOW_ID,
                userId: 'my_user_123',
                reply_to: 'my_reply_to_exchange'
            };

            const result = sailor.readIncomingMessageHeaders({
                properties: {
                    headers
                }
            });

            expect(result).toEqual(headers);
        });

        it('should copy standard headers, reply_to and x-eio headers', () => {
            const sailor = new Sailor(settings);

            const headers = {
                execId: 'my_exec_123',
                taskId: settings.FLOW_ID,
                userId: 'my_user_123',
                reply_to: 'my_reply_to_exchange',
                'x-eio-meta-lowercase': 'I am lowercase',
                'X-eio-meta-miXeDcAse': 'Eventually to become lowercase'
            };

            const result = sailor.readIncomingMessageHeaders({
                properties: {
                    headers
                }
            });

            expect(result).toEqual({
                execId: 'my_exec_123',
                taskId: settings.FLOW_ID,
                userId: 'my_user_123',
                reply_to: 'my_reply_to_exchange',
                'x-eio-meta-lowercase': 'I am lowercase',
                'x-eio-meta-mixedcase': 'Eventually to become lowercase'
            });
        });
    });
});
