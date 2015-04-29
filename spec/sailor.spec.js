describe('Sailor', function () {

    var envVars = {};
    envVars.DEBUG='sailor';
    envVars.MONGO_URI = 'mongodb://test/test';
    envVars.AMQP_URI = 'amqp://test2/test2';
    envVars.TASK_ID = '1234567890';
    envVars.STEP_ID = 'step_1';
    envVars.STEP_INFO = '{"function":"list"}';
    envVars.COMPONENT_PATH='/spec/component';

    var mongo = require('../lib/mongo.js');
    var amqp = require('../lib/amqp.js');
    var settings = require('../lib/settings.js').readFrom(envVars);
    var cipher = require('../lib/cipher.js');
    var Sailor = require('../lib/sailor.js').Sailor;

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
                taskId: "",
                stepId: ""
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

    describe('processMessage', function () {

        it('should call processData() and ack() if success', function () {

            var fakeMongoConnection = jasmine.createSpyObj("MongoConnection", ['connect']);
            var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", [
                'connect','processData','processError','processRebound','ack','reject'
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

                expect(fakeAMQPConnection.processData).toHaveBeenCalled();
                expect(fakeAMQPConnection.processData.calls[0].args[0]).toEqual({items: [1,2,3,4,5,6]});
                expect(fakeAMQPConnection.processData.calls[0].args[1]).toEqual(message);

                expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
            });
        });

        it('should call processRebound() and ack()', function () {

            var fakeMongoConnection = jasmine.createSpyObj("MongoConnection", ['connect']);
            var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", [
                'connect','processData','processError','processRebound','ack','reject'
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

                expect(fakeAMQPConnection.processRebound).toHaveBeenCalled();
                expect(fakeAMQPConnection.processRebound.calls[0].args[0].message).toEqual('Rebound reason');
                expect(fakeAMQPConnection.processRebound.calls[0].args[1]).toEqual(message);

                expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
            });
        });

        it('should send error if error happened', function () {

            var fakeMongoConnection = jasmine.createSpyObj("MongoConnection", ['connect']);
            var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", [
                'connect','processData','processError','processRebound','ack','reject'
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
                expect(fakeAMQPConnection.processError).toHaveBeenCalled();
                expect(fakeAMQPConnection.processError.calls[0].args[0].message).toEqual('Some component error');
                expect(fakeAMQPConnection.processError.calls[0].args[0].stack).not.toBeUndefined();
                expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
            });
        });

        it('should catch all data calls and all error calls', function () {

            var fakeMongoConnection = jasmine.createSpyObj("MongoConnection", ['connect']);
            var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", [
                'connect','processData','processError','processRebound','ack','reject'
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
                expect(fakeAMQPConnection.processData).toHaveBeenCalled();
                expect(fakeAMQPConnection.processData.calls.length).toEqual(3);

                // error
                expect(fakeAMQPConnection.processError).toHaveBeenCalled();
                expect(fakeAMQPConnection.processError.calls.length).toEqual(2);

                // ack
                expect(fakeAMQPConnection.ack).toHaveBeenCalled();
                expect(fakeAMQPConnection.ack.callCount).toEqual(1);
                expect(fakeAMQPConnection.ack.calls[0].args[0]).toEqual(message);
            });
        });

    });

});
