describe('AMQP', function () {

    var envVars = {};
    envVars.MONGO_URI = 'mongodb://test/test';
    envVars.AMQP_URI = 'amqp://test2/test2';
    envVars.TASK_ID = '1234567890';
    envVars.STEP_ID = 'step_1';

    var AMQPConnection = require('../lib/amqp.js').AMQPConnection;
    var settings = require('../lib/settings.js').readFrom(envVars);
    var cipher = require('../lib/cipher.js');

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
                taskId: "task1234567890",
                stepId: "step_456"
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
        content: cipher.encryptMessageContent({"content": "Message content"})
    };

    it('Should send message to outgoing channel when process data', function () {

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['sendToQueue']);

        amqp.processData({"content": "Message content"}, message);

        expect(amqp.publishChannel.sendToQueue).toHaveBeenCalled();
        expect(amqp.publishChannel.sendToQueue.callCount).toEqual(1);

        var args = amqp.publishChannel.sendToQueue.calls[0].args;
        expect(args[0]).toEqual(settings.OUTGOING_MESSAGES_QUEUE.name);

        var payload = cipher.decryptMessageContent(args[1].toString());
        expect(payload).toEqual({ content : 'Message content' });

        var options = args[2];
        expect(options).toEqual({
            contentType : 'application/json',
            contentEncoding : 'utf8',
            mandatory : true,
            headers : {
                taskId : 'task1234567890',
                stepId : 'step_456'
            }
        });
    });

    it('Should send message to outgoing errors when process error', function () {

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['sendToQueue']);
        amqp.processError(new Error('Test error'), message);

        expect(amqp.publishChannel.sendToQueue).toHaveBeenCalled();
        expect(amqp.publishChannel.sendToQueue.callCount).toEqual(1);

        var args = amqp.publishChannel.sendToQueue.calls[0].args;
        expect(args[0]).toEqual(settings.ERRORS_QUEUE.name);

        var payload = cipher.decryptMessageContent(args[1].toString());
        expect(payload.message).toEqual('Test error');

        var options = args[2];
        expect(options).toEqual({
            contentType : 'application/json',
            contentEncoding : 'utf8',
            mandatory : true,
            headers : {
                taskId : 'task1234567890',
                stepId : 'step_456'
            }
        });
    });

    it('Should send message to rebounds channel when process rebound', function () {

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['sendToQueue']);

        amqp.processRebound(new Error("Rebound error"), message);

        expect(amqp.publishChannel.sendToQueue).toHaveBeenCalled();
        expect(amqp.publishChannel.sendToQueue.callCount).toEqual(1);

        var args = amqp.publishChannel.sendToQueue.calls[0].args;
        expect(args[0]).toEqual(settings.REBOUNDS_QUEUE.name);

        var payload = cipher.decryptMessageContent(args[1].toString());
        expect(payload).toEqual({content: 'Message content'});

        var options = args[2];
        expect(options.headers.reboundIteration).toEqual(1);
        expect(options.headers.taskId).toEqual('task1234567890');
        expect(options.headers.stepId).toEqual('step_456');
    });


    it('Should ack message when confirmed', function () {

        var amqp = new AMQPConnection();
        amqp.subscribeChannel = jasmine.createSpyObj('subscribeChannel', ['ack']);

        amqp.ack(message);

        expect(amqp.subscribeChannel.ack).toHaveBeenCalled();
        expect(amqp.subscribeChannel.ack.callCount).toEqual(1);
        expect(amqp.subscribeChannel.ack.calls[0].args[0]).toEqual(message);
    });

    it('Should reject message when ack is called with false', function () {

        var amqp = new AMQPConnection(settings);
        amqp.subscribeChannel = jasmine.createSpyObj('subscribeChannel', ['reject']);
        amqp.ack(message, false);

        expect(amqp.subscribeChannel.reject).toHaveBeenCalled();
        expect(amqp.subscribeChannel.reject.callCount).toEqual(1);
        expect(amqp.subscribeChannel.reject.calls[0].args[0]).toEqual(message);
        expect(amqp.subscribeChannel.reject.calls[0].args[1]).toEqual(false);
    });

    it('Should listen queue and pass decrypted message to client function', function () {

        var amqp = new AMQPConnection(settings);
        var clientFunction = jasmine.createSpy('clientFunction');
        amqp.subscribeChannel = jasmine.createSpyObj('subscribeChannel', ['consume']);
        amqp.subscribeChannel.consume.andCallFake(function(queueName, callback){
            callback(message);
        });

        runs(function(){
            amqp.listenQueue('testQueue', clientFunction);
        });

        waitsFor(function(){
            return clientFunction.callCount > 0;
        });

        runs(function(){
            expect(clientFunction.callCount).toEqual(1);
            expect(clientFunction.calls[0].args[0]).toEqual({"content": "Message content"});
            expect(clientFunction.calls[0].args[1]).toEqual(message);
            expect(clientFunction.calls[0].args[1].content).toEqual(cipher.encryptMessageContent({"content": "Message content"}));
        });
    });

});
