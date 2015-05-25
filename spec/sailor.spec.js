describe('Sailor', function () {

    var envVars = {};
    envVars.MONGO_URI = 'mongodb://test/test';
    envVars.AMQP_URI = 'amqp://test2/test2';
    envVars.TASK = '{"id":"5559edd38968ec0736000003","data":{"step_1":{"account":"1234567890"}},"recipe":{"nodes":[{"id":"step_1","function":"list"}]}}';
    envVars.STEP_ID = 'step_1';

    envVars.LISTEN_MESSAGES_ON = '5559edd38968ec0736000003:step_1:1432205514864:messages';
    envVars.PUBLISH_MESSAGES_TO = 'userexchange:5527f0ea43238e5d5f000001';
    envVars.DATA_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:message';
    envVars.ERROR_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:error';
    envVars.REBOUND_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:rebound';

    envVars.COMPONENT_PATH='/spec/component';
    envVars.DEBUG='sailor';

    var mongo = require('../lib/mongo.js');
    var amqp = require('../lib/amqp.js');
    var settings = require('../lib/settings.js').readFrom(envVars);
    var cipher = require('../lib/cipher.js');
    var Sailor = require('../lib/sailor.js').Sailor;
    var Q = require('q');

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
                execId: "exec1"
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
        content: new Buffer(cipher.encryptMessageContent(payload))
    };

    describe('connection', function () {

        it('should disconnect Mongo and RabbitMQ, and exit process', function () {

            var fakeMongoConnection = jasmine.createSpyObj("MongoConnection", ['disconnect']);
            fakeMongoConnection.disconnect.andReturn(Q.resolve());

            var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", ['disconnect']);
            fakeAMQPConnection.disconnect.andReturn(Q.resolve());

            spyOn(mongo, "MongoConnection").andReturn(fakeMongoConnection);
            spyOn(amqp, "AMQPConnection").andReturn(fakeAMQPConnection);
            spyOn(process, "exit").andReturn(0);

            var sailor = new Sailor(settings);

            var promise;

            runs(function(){
                promise = sailor.disconnect();
            });

            waitsFor(function(){
                return promise.isFulfilled() || promise.isRejected();
            }, 10000);

            runs(function(){
                expect(promise.isFulfilled()).toBeTruthy();
                //expect(fakeMongoConnection.disconnect).toHaveBeenCalled();
                expect(fakeAMQPConnection.disconnect).toHaveBeenCalled();
            });

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
            expect(data).toEqual({account : '1234567890'});
        });
    });



    describe('processMessage', function () {

        it('should call sendData() and ack() if success', function () {

            var fakeMongoConnection = jasmine.createSpyObj("MongoConnection", ['connect']);
            var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", [
                'connect','sendData','sendError','sendRebound','ack','reject'
            ]);

            spyOn(mongo, "MongoConnection").andReturn(fakeMongoConnection);
            spyOn(amqp, "AMQPConnection").andReturn(fakeAMQPConnection);

            var sailor = new Sailor(settings);

            spyOn(sailor, "getStepInfo").andReturn({
                function: "data_trigger"
            });

            var promise;

            runs(function(){
                promise = sailor.connect().then(function(){
                    return sailor.processMessage(payload, message);
                }).fail(function(err){
                    console.log(err);
                })
            });

            waitsFor(function(){
                return promise.isFulfilled() || promise.isRejected();
            }, 10000);

            runs(function(){
                expect(promise.isFulfilled()).toBeTruthy();
                expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                expect(fakeAMQPConnection.sendData).toHaveBeenCalled();
                expect(fakeAMQPConnection.sendData.calls[0].args[0]).toEqual({items: [1,2,3,4,5,6]});
                expect(fakeAMQPConnection.sendData.calls[0].args[1]).toEqual(message);

                expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
            });
        });

        it('should call sendRebound() and ack()', function () {

            var fakeMongoConnection = jasmine.createSpyObj("MongoConnection", ['connect']);
            var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", [
                'connect','sendData','sendError','sendRebound','ack','reject'
            ]);

            spyOn(mongo, "MongoConnection").andReturn(fakeMongoConnection);
            spyOn(amqp, "AMQPConnection").andReturn(fakeAMQPConnection);

            var sailor = new Sailor(settings);

            spyOn(sailor, "getStepInfo").andReturn({
                function: "rebound_trigger"
            });

            var promise;

            runs(function(){
                promise = sailor.connect().then(function(){
                    return sailor.processMessage(payload, message);
                }).fail(function(err){
                    console.log(err);
                })
            });

            waitsFor(function(){
                return promise.isFulfilled() || promise.isRejected();
            }, 10000);

            runs(function(){
                expect(promise.isFulfilled()).toBeTruthy();
                expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                expect(fakeAMQPConnection.sendRebound).toHaveBeenCalled();
                expect(fakeAMQPConnection.sendRebound.calls[0].args[0].message).toEqual('Rebound reason');
                expect(fakeAMQPConnection.sendRebound.calls[0].args[1]).toEqual(message);

                expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
            });
        });

        it('should send error if error happened', function () {

            var fakeMongoConnection = jasmine.createSpyObj("MongoConnection", ['connect']);
            var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", [
                'connect','sendData','sendError','sendRebound','ack','reject'
            ]);

            spyOn(mongo, "MongoConnection").andReturn(fakeMongoConnection);
            spyOn(amqp, "AMQPConnection").andReturn(fakeAMQPConnection);

            var sailor = new Sailor(settings);

            spyOn(sailor, "getStepInfo").andReturn({
                function: "error_trigger"
            });

            var promise;

            runs(function(){
                promise = sailor.connect().then(function(){
                    return sailor.processMessage(payload, message);
                }).fail(function(err){
                    console.log(err);
                })
            });

            waitsFor(function(){
                return promise.isFulfilled() || promise.isRejected();
            }, 10000);

            runs(function(){
                expect(promise.isFulfilled()).toBeTruthy();
                expect(fakeAMQPConnection.connect).toHaveBeenCalled();
                expect(fakeAMQPConnection.sendError).toHaveBeenCalled();
                expect(fakeAMQPConnection.sendError.calls[0].args[0].message).toEqual('Some component error');
                expect(fakeAMQPConnection.sendError.calls[0].args[0].stack).not.toBeUndefined();
                expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
            });
        });

        xit('should catch all data calls and all error calls', function () {

            var fakeMongoConnection = jasmine.createSpyObj("MongoConnection", ['connect']);
            var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", [
                'connect','sendData','sendError','sendRebound','ack','reject'
            ]);

            spyOn(mongo, "MongoConnection").andReturn(fakeMongoConnection);
            spyOn(amqp, "AMQPConnection").andReturn(fakeAMQPConnection);

            var sailor = new Sailor(settings);

            spyOn(sailor, "getStepInfo").andReturn({
                function: "datas_and_errors"
            });

            var promise;

            runs(function(){
                promise = sailor.connect().then(function(){
                    return sailor.processMessage(payload, message);
                }).fail(function(err){
                    console.log(err);
                })
            });

            waitsFor(function(){
                return promise.isFulfilled() || promise.isRejected();
            }, 10000);

            runs(function(){
                expect(promise.isFulfilled()).toBeTruthy();
                expect(fakeAMQPConnection.connect).toHaveBeenCalled();

                // data
                expect(fakeAMQPConnection.sendData).toHaveBeenCalled();
                expect(fakeAMQPConnection.sendData.calls.length).toEqual(3);

                // error
                expect(fakeAMQPConnection.sendError).toHaveBeenCalled();
                expect(fakeAMQPConnection.sendError.calls.length).toEqual(2);

                // ack
                expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
            });
        });

    });

});
