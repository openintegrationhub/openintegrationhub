describe('AMQP', function () {

    process.env.MONGO_URI = 'mongodb://test/test';
    process.env.AMQP_URI = 'amqp://test2/test2';
    process.env.TASK_ID = '1234567890';
    process.env.STEP_ID = 'step_1';

    var AMQPConnection = require('../lib/amqp.js').AMQPConnection;

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
        content: new Buffer(JSON.stringify({"content": "Message content"}))
    };

    it('Should send message to outgoing channel when process data', function () {

        var amqp = new AMQPConnection();
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['sendToQueue']);
        amqp.processData({"content": "Message content"});

        expect(amqp.publishChannel.sendToQueue).toHaveBeenCalled();
        expect(amqp.publishChannel.sendToQueue.callCount).toEqual(1);
    });

    it('Should send message to outgoing errors when process error', function () {

        var amqp = new AMQPConnection();
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['sendToQueue']);
        amqp.processError(new Error('Test error'));
        expect(amqp.publishChannel.sendToQueue).toHaveBeenCalled();
        expect(amqp.publishChannel.sendToQueue.callCount).toEqual(1);
    });

    it('Should send message to rebounds channel when process rebound', function () {

        var amqp = new AMQPConnection();
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['sendToQueue']);

        amqp.processRebound(message, new Error("Rebound error"));
        expect(amqp.publishChannel.sendToQueue).toHaveBeenCalled();
        expect(amqp.publishChannel.sendToQueue.callCount).toEqual(1);
    });

    it('Should ack message when confirmed', function () {

        var amqp = new AMQPConnection();
        amqp.subscribeChannel = jasmine.createSpyObj('subscribeChannel', ['ack']);
        amqp.ack(message);

        expect(amqp.subscribeChannel.ack).toHaveBeenCalled();
        expect(amqp.subscribeChannel.ack.callCount).toEqual(1);
    });

    it('Should reject message when ack is called with false', function () {

        var amqp = new AMQPConnection();
        amqp.subscribeChannel = jasmine.createSpyObj('subscribeChannel', ['reject']);
        amqp.ack(message, false);

        expect(amqp.subscribeChannel.reject).toHaveBeenCalled();
        expect(amqp.subscribeChannel.reject.callCount).toEqual(1);
    });

    it('Should listen queue and process incoming messages', function () {

        var amqp = new AMQPConnection();
        amqp.subscribeChannel = {
            consume: function(queueName, callback){}
        };
        spyOn(amqp.subscribeChannel, 'consume').andCallFake(function(queueName, callback){
            callback(message);
        });

        amqp.listenQueue('testQueue', function(originalMessage, decryptedMessage){
            console.log('Client function called');
        });

        expect(amqp.subscribeChannel.consume).toHaveBeenCalled();

    });



});
