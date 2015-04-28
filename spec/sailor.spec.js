describe('Sailor', function () {

    process.env.DEBUG='sailor';
    process.env.MONGO_URI = 'mongodb://test/test';
    process.env.AMQP_URI = 'amqp://test2/test2';
    process.env.TASK_ID = '1234567890';
    process.env.STEP_ID = 'step_1';
    process.env.STEP_INFO = '{"function":"list"}';
    process.env.COMPONENT_PATH='/spec/component';

    var mongo = require('../lib/mongo.js');
    var amqp = require('../lib/amqp.js');
    var settings = require('../lib/settings.js');
    var Sailor = require('../lib/sailor.js').Sailor;

    describe('processMessage', function () {

        var payload = "test payload of the message";

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
            content: new Buffer(JSON.stringify(payload))
        };

        xit('should send data to outgoing queue', function () {

            var fakeMongoConnection = jasmine.createSpyObj("MongoConnection", ['connect']);
            var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", ['connect','sendToQueue','rebound','ack','reject']);

            spyOn(mongo, "MongoConnection").andReturn(fakeMongoConnection);
            spyOn(amqp, "AMQPConnection").andReturn(fakeAMQPConnection);

            var sailor = new Sailor();

            spyOn(sailor, "getStepInfo").andReturn({
                function: "data_trigger"
            });

            var promise;

            runs(function(){
                promise = sailor.connect().then(function(){
                    return sailor.processMessage(message);
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
                expect(fakeAMQPConnection.sendToQueue).toHaveBeenCalled();
                expect(fakeAMQPConnection.sendToQueue.calls[0].args[0]).toEqual(settings.OUTGOING_MESSAGES_QUEUE.name);
                expect(fakeAMQPConnection.sendToQueue.calls[0].args[1]).toEqual( {items: [1,2,3,4,5,6]});
                expect(fakeAMQPConnection.ack).toHaveBeenCalled();
            });


        });

        xit('should rebound message if rebound happened', function () {

            var fakeMongoConnection = jasmine.createSpyObj("MongoConnection", ['connect']);
            var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", ['connect','sendToQueue','rebound','ack','reject']);

            spyOn(mongo, "MongoConnection").andReturn(fakeMongoConnection);
            spyOn(amqp, "AMQPConnection").andReturn(fakeAMQPConnection);

            var sailor = new Sailor();

            spyOn(sailor, "getStepInfo").andReturn({
                function: "rebound_trigger"
            });

            var promise;

            runs(function(){
                promise = sailor.connect().then(function(){
                    return sailor.processMessage(message);
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
                expect(fakeAMQPConnection.rebound).toHaveBeenCalled();
                expect(fakeAMQPConnection.rebound.calls[0].args[0]).toEqual(message);
                expect(fakeAMQPConnection.rebound.calls[0].args[1].message).toEqual('Rebound reason');
                expect(fakeAMQPConnection.ack).toHaveBeenCalled();
            });
        });

        xit('should send error if error happened', function () {

            var fakeMongoConnection = jasmine.createSpyObj("MongoConnection", ['connect']);
            var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", ['connect','sendToQueue','rebound','ack','reject']);

            spyOn(mongo, "MongoConnection").andReturn(fakeMongoConnection);
            spyOn(amqp, "AMQPConnection").andReturn(fakeAMQPConnection);

            var sailor = new Sailor();

            spyOn(sailor, "getStepInfo").andReturn({
                function: "error_trigger"
            });

            var promise;

            runs(function(){
                promise = sailor.connect().then(function(){
                    return sailor.processMessage(message);
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
                expect(fakeAMQPConnection.sendToQueue).toHaveBeenCalled();
                expect(fakeAMQPConnection.sendToQueue.calls[0].args[0]).toEqual(settings.ERRORS_QUEUE.name);
                expect(fakeAMQPConnection.sendToQueue.calls[0].args[1].message).toEqual('Some component error');
                expect(fakeAMQPConnection.sendToQueue.calls[0].args[1].stack).not.toBeUndefined();
                expect(fakeAMQPConnection.ack).toHaveBeenCalled();
            });
        });

        it('should catch all data calls and all error calls', function () {

            var fakeMongoConnection = jasmine.createSpyObj("MongoConnection", ['connect']);
            var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", ['connect','sendToQueue','rebound','ack','reject']);

            spyOn(mongo, "MongoConnection").andReturn(fakeMongoConnection);
            spyOn(amqp, "AMQPConnection").andReturn(fakeAMQPConnection);

            var sailor = new Sailor();

            spyOn(sailor, "getStepInfo").andReturn({
                function: "datas_and_errors"
            });

            var promise;

            runs(function(){
                promise = sailor.connect().then(function(){
                    return sailor.processMessage(message);
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
                expect(fakeAMQPConnection.sendToQueue).toHaveBeenCalled();
                expect(fakeAMQPConnection.sendToQueue.calls.length).toEqual(5);

                expect(fakeAMQPConnection.sendToQueue.calls[0].args[0]).toEqual(settings.OUTGOING_MESSAGES_QUEUE.name);
                expect(fakeAMQPConnection.sendToQueue.calls[1].args[0]).toEqual(settings.ERRORS_QUEUE.name);
                expect(fakeAMQPConnection.sendToQueue.calls[2].args[0]).toEqual(settings.OUTGOING_MESSAGES_QUEUE.name);
                expect(fakeAMQPConnection.sendToQueue.calls[3].args[0]).toEqual(settings.ERRORS_QUEUE.name);
                expect(fakeAMQPConnection.sendToQueue.calls[4].args[0]).toEqual(settings.OUTGOING_MESSAGES_QUEUE.name);
                expect(fakeAMQPConnection.sendToQueue.calls[3].args[0]).toEqual(settings.ERRORS_QUEUE.name);
            });
        });

    });

});
