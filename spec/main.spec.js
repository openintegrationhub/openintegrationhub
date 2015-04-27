describe('Sailor', function () {

    process.env.DEBUG='sailor'

    var mongo = require('../lib/mongo.js');
    var Q = require('q');

    it('Process message', function () {

        process.env.MONGO_URI = 'mongodb://test/test';
        process.env.AMQP_URI = 'amqp://guest:guest@localhost:5672';
        process.env.TASK_ID = '1234567890';
        process.env.STEP_ID = 'step_1';
        process.env.STEP_INFO = '{"function":"list"}';
        process.env.COMPONENT_PATH='/spec/component'

        spyOn(mongo, 'MongoConnection').andReturn({
            connect: function(){
                return Q.resolve();
            }
        });

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

        var sailor = require('../run.js');

        sailor.connect().then(function(){
            console.log('Connected!');
            sailor.processMessage(message);
        });


    });

});
