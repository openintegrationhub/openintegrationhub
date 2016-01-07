describe('Sailor', function () {
    var envVars = {};
    envVars.ELASTICIO_AMQP_URI = 'amqp://test2/test2';
    envVars.ELASTICIO_TASK = JSON.stringify({
        "_id" : "5559edd38968ec0736000003",
        "data" : {
            "step_1" : {
                "_account" : "1234567890"
            }
        },
        "recipe" : {
            "nodes" : [{
                "id" : "step_1",
                "function" : "list"
            }]},
        "snapshot": {
            "step_1": {"someId": "someData"}
        }
    });
    envVars.ELASTICIO_STEP_ID = 'step_1';

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

    var amqp = require('../lib/amqp.js');
    var settings;
    var encryptor = require('../lib/encryptor.js');
    var Sailor = require('../lib/sailor.js').Sailor;
    var _ = require('lodash');
    var Q = require('q');
    var nock = require('nock');

    var payload = {param1: "Value1"};

    var message = {
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
        settings = require('../lib/settings.js').readFrom(envVars);
    });

    describe('connection', function (done) {
        it('should disconnect Mongo and RabbitMQ, and exit process', function (done) {
            var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", ['disconnect']);
            fakeAMQPConnection.disconnect.andReturn(Q.resolve());

            spyOn(amqp, "AMQPConnection").andReturn(fakeAMQPConnection);
            spyOn(process, "exit").andReturn(0);

            var sailor = new Sailor(settings);

            sailor.disconnect()
                .then(function(){
                    expect(fakeAMQPConnection.disconnect).toHaveBeenCalled();
                })
                .done(done, done.fail);
        });
    });

    describe('getStepInfo', function () {
        it('should get step info from task.recipe.nodes', function () {
            var sailor = new Sailor(settings);
            var data = sailor.getStepInfo("step_1");
            expect(data).toEqual({ id : 'step_1', function : 'list'});
        });
    });

    describe('getStepCfg', function () {
        it('should get step cfg from task.data', function () {
            var sailor = new Sailor(settings);
            var data = sailor.getStepCfg("step_1");
            expect(data).toEqual({_account : '1234567890'});
        });

        it('should get empty object as cfg when there is no config for a step', function () {
            var sailor = new Sailor(settings);
            var data = sailor.getStepCfg("step_2");
            expect(data).toEqual({});
        });
    });

    describe('getStepSnapshot', function () {
        it('should get step snapshot from task.snapshot', function () {
            var sailor = new Sailor(settings);
            var data = sailor.getStepSnapshot("step_1");
            expect(data).toEqual({someId : 'someData'});
        });
    });

    describe('processMessage', function () {
        var fakeAMQPConnection;

        beforeEach(function(){
            fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", [
                'connect','sendData','sendError','sendRebound','ack','reject',
                'sendSnapshot'
            ]);

            spyOn(amqp, "AMQPConnection").andReturn(fakeAMQPConnection);
        });

        it('should call sendData() and ack() if success', function (done) {
            var sailor = new Sailor(settings);

            spyOn(sailor, "getStepInfo").andReturn({
                function: "data_trigger"
            });

            sailor.connect()
                .then(function(){
                    return sailor.processMessage(payload, message);
                })
                .then(function(){
                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                    expect(fakeAMQPConnection.sendData).toHaveBeenCalled();

                    var sendDataCalls = fakeAMQPConnection.sendData.calls;

                    expect(sendDataCalls[0].args[0]).toEqual({items: [1,2,3,4,5,6]});
                    expect(sendDataCalls[0].args[1]).toEqual(jasmine.any(Object));
                    expect(sendDataCalls[0].args[1]).toEqual({
                        execId: 'exec1',
                        taskId: '5559edd38968ec0736000003',
                        userId: '5559edd38968ec0736000002',
                        stepId: 'step_1',
                        compId: undefined,
                        function: 'data_trigger',
                        start: jasmine.any(Number),
                        cid: 1,
                        end: jasmine.any(Number)
                    });

                    expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                    expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                    expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
                })
                .done(done, done.fail);
        });

        it('should send request to API server to update keys', function (done) {

            var sailor = new Sailor(settings);

            spyOn(sailor, "getStepInfo").andReturn({
                function: "keys_trigger"
            });

            var nockScope = nock('http://apihost.com:80')
                .put('/v1/accounts/1234567890', {keys: {oauth: {access_token: 'newAccessToken'}}})
                .reply(200, "Success");

            sailor.connect()
                .then(function(){
                    return sailor.processMessage(payload, message);
                })
                .then(function(){
                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                    // check that PUT request was sent
                    expect(nockScope.isDone()).toBeTruthy();

                    expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                    expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                    expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
                })
                .done(done, done.fail);
        });

        it('should emit error if failed to update keys', function (done) {
            var sailor = new Sailor(settings);

            spyOn(sailor, "getStepInfo").andReturn({
                function: "keys_trigger"
            });

            var nockScope = nock('http://apihost.com:80')
                .put('/v1/accounts/1234567890', {keys: {oauth: {access_token: 'newAccessToken'}}})
                .reply(400, "Failed");

            sailor.connect()
                .then(function(){
                    return sailor.processMessage(payload, message);
                })
                .then(function() {
                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                    // check that PUT request was sent
                    expect(nockScope.isDone()).toBeTruthy();
                    expect(fakeAMQPConnection.sendError).toHaveBeenCalled();
                    expect(fakeAMQPConnection.sendError.calls[0].args[0].message).toEqual('Failed to update keys: API server replied with status 400 ("Failed")');

                    expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                    expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                    expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
                })
                .done(done, done.fail);
        });

        it('should call sendRebound() and ack()', function (done) {
            var sailor = new Sailor(settings);

            spyOn(sailor, "getStepInfo").andReturn({
                function: "rebound_trigger"
            });

            sailor.connect()
                .then(function() {
                    return sailor.processMessage(payload, message);
                })
                .then(function() {
                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                    expect(fakeAMQPConnection.sendRebound).toHaveBeenCalled();
                    expect(fakeAMQPConnection.sendRebound.calls[0].args[0].message).toEqual('Rebound reason');
                    expect(fakeAMQPConnection.sendRebound.calls[0].args[1]).toEqual(message);

                    expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                    expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                    expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
                })
                .done(done, done.fail);
        });

        it('should call sendSnapshot() and ack() after a `snapshot` event', function (done) {
            var sailor = new Sailor(settings);

            spyOn(sailor, "getStepInfo").andReturn({
                function: "update"
            });

            sailor.connect()
                .then(function(){
                    var payload = {
                        snapshot : {blabla : 'blablabla'}
                    };
                    return sailor.processMessage(payload, message);
                })
                .then(function() {
                    var expectedSnapshot = {blabla:'blablabla'};
                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                    expect(fakeAMQPConnection.sendSnapshot.callCount).toBe(1);
                    expect(fakeAMQPConnection.sendSnapshot.calls[0].args[0]).toEqual(expectedSnapshot);
                    expect(fakeAMQPConnection.sendSnapshot.calls[0].args[1].snapshotEvent).toEqual('snapshot');
                    expect(sailor.snapshot).toEqual(expectedSnapshot);
                    expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                    expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                    expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
                })
                .done(done, done.fail);
        });

        it('should call sendSnapshot() and ack() after an `updateSnapshot` event', function (done) {
            var sailor = new Sailor(settings);

            spyOn(sailor, "getStepInfo").andReturn({
                function: "update"
            });

            sailor.connect()
                .then(function(){
                    var payload = {
                        updateSnapshot : {updated : 'value'}
                    };
                    return sailor.processMessage(payload, message);
                })
                .then(function() {
                    var expectedSnapshot = {someId: 'someData', updated: 'value'};
                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                    expect(fakeAMQPConnection.sendSnapshot.callCount).toBe(1);
                    expect(fakeAMQPConnection.sendSnapshot.calls[0].args[0]).toEqual({updated: 'value'});
                    expect(fakeAMQPConnection.sendSnapshot.calls[0].args[1].snapshotEvent).toEqual('updateSnapshot');
                    expect(sailor.snapshot).toEqual(expectedSnapshot);
                    expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                    expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                    expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
                })
                .done(done, done.fail);
        });

        it('should send error if error happened', function (done) {
            var sailor = new Sailor(settings);

            spyOn(sailor, "getStepInfo").andReturn({
                function: "error_trigger"
            });

            sailor.connect()
                .then(function(){
                    return sailor.processMessage(payload, message);
                })
                .then(function() {
                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                    expect(fakeAMQPConnection.sendError).toHaveBeenCalled();
                    expect(fakeAMQPConnection.sendError.calls[0].args[0].message).toEqual('Some component error');
                    expect(fakeAMQPConnection.sendError.calls[0].args[0].stack).not.toBeUndefined();
                    expect(fakeAMQPConnection.sendError.calls[0].args[2]).toEqual(message.content);

                    expect(fakeAMQPConnection.reject).toHaveBeenCalled();
                    expect(fakeAMQPConnection.reject.callCount).toEqual(1);
                    expect(fakeAMQPConnection.reject.calls[0].args[0]).toEqual(message);
                })
                .done(done, done.fail);
        });

        it('should reject message if trigger is missing', function (done) {
            var sailor = new Sailor(settings);

            spyOn(sailor, "getStepInfo").andReturn({
                function: "missing_trigger"
            });

            sailor.connect()
                .then(function(){
                    return sailor.processMessage(payload, message);
                })
                .then(function() {
                    expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                    expect(fakeAMQPConnection.sendError).toHaveBeenCalled();
                    expect(fakeAMQPConnection.sendError.calls[0].args[0].message).toEqual(
                        "Trigger or action 'missing_trigger' is not found. " +
                        "Please check if the path you specified in component.json ('./triggers/missing_trigger.js') is valid."
                    );
                    expect(fakeAMQPConnection.sendError.calls[0].args[0].stack).not.toBeUndefined();
                    expect(fakeAMQPConnection.sendError.calls[0].args[2]).toEqual(message.content);

                    expect(fakeAMQPConnection.reject).toHaveBeenCalled();
                    expect(fakeAMQPConnection.reject.callCount).toEqual(1);
                    expect(fakeAMQPConnection.reject.calls[0].args[0]).toEqual(message);
                })
                .done(done, done.fail);
        });

        it('should not process message if taskId in header is not equal to task._id', function (done) {

            var message2 = _.cloneDeep(message);
            message2.properties.headers.taskId = "othertaskid";

            var sailor = new Sailor(settings);

            spyOn(sailor, "getStepInfo").andReturn({
                function: "error_trigger"
            });

            sailor.connect()
                .then(function(){
                    return sailor.processMessage(payload, message2);
                })
                .then(function() {
                    expect(fakeAMQPConnection.reject).toHaveBeenCalled();
                })
                .done(done, done.fail);
        });

        it('should catch all data calls and all error calls', function (done) {

            var sailor = new Sailor(settings);

            spyOn(sailor, "getStepInfo").andReturn({
                function: "datas_and_errors"
            });

            sailor.connect()
                .then(function(){
                    return sailor.processMessage(payload, message);
                })
                .then(function() {
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
                })
                .done(done, done.fail);
        });
    });
});
