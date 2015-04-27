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

    it('Process message', function () {

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

        var fakeMongoConnection = jasmine.createSpyObj("MongoConnection", ['connect']);
        var fakeAMQPConnection = jasmine.createSpyObj("AMQPConnection", ['connect','sendToQueue','rebound','ack','reject']);

        spyOn(mongo, "MongoConnection").andReturn(fakeMongoConnection);
        spyOn(amqp, "AMQPConnection").andReturn(fakeAMQPConnection);

        var sailor = require('../lib/sailor.js');

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
            /*expect(fakeAMQPConnection.sendToQueue).toHaveBeenCalledWith(
                settings.OUTGOING_MESSAGES_QUEUE.name,
                jasmine.any(Object)
            );*/
            expect(fakeAMQPConnection.ack).toHaveBeenCalled();
        });


    });

});
