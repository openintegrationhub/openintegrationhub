describe('AMQP', function () {

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

    var AMQPConnection = require('../lib/amqp.js').AMQPConnection;
    var settings = require('../lib/settings.js').readFrom(envVars);
    var cipher = require('../lib/cipher.js');
    var _ = require('lodash');

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
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish']);

        amqp.sendData({"content": "Message content"}, message, {
            taskId : 'task1234567890',
            stepId : 'step_456'
        });

        expect(amqp.publishChannel.publish).toHaveBeenCalled();
        expect(amqp.publishChannel.publish.callCount).toEqual(1);

        var args = amqp.publishChannel.publish.calls[0].args;
        expect(args[0]).toEqual(settings.PUBLISH_MESSAGES_TO);
        expect(args[1]).toEqual(settings.DATA_ROUTING_KEY);

        var payload = cipher.decryptMessageContent(args[2].toString());
        expect(payload).toEqual({ content : 'Message content' });

        var options = args[3];
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
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish']);
        amqp.sendError(new Error('Test error'), message, {
            taskId : 'task1234567890',
            stepId : 'step_456'
        });

        expect(amqp.publishChannel.publish).toHaveBeenCalled();
        expect(amqp.publishChannel.publish.callCount).toEqual(1);

        var args = amqp.publishChannel.publish.calls[0].args;
        expect(args[0]).toEqual(settings.PUBLISH_MESSAGES_TO);
        expect(args[1]).toEqual(settings.ERROR_ROUTING_KEY);

        var payload = cipher.decryptMessageContent(args[2].toString());
        expect(payload.message).toEqual('Test error');

        var options = args[3];
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

        var clonedMessage = _.cloneDeep(message);
        clonedMessage.properties.headers.reboundIteration = 100;

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish']);

        amqp.sendRebound(new Error("Rebound error"), clonedMessage, {
            taskId : 'task1234567890',
            stepId : 'step_456'
        });

        expect(amqp.publishChannel.publish).toHaveBeenCalled();
        expect(amqp.publishChannel.publish.callCount).toEqual(1);

        var args = amqp.publishChannel.publish.calls[0].args;
        expect(args[0]).toEqual(settings.PUBLISH_MESSAGES_TO);
        expect(args[1]).toEqual(settings.ERROR_ROUTING_KEY);

        var payload = cipher.decryptMessageContent(args[2].toString());
        expect(payload.message).toEqual('Rebound limit exceeded');

        var options = args[3];
        expect(options.headers.taskId).toEqual('task1234567890');
        expect(options.headers.stepId).toEqual('step_456');
    });

    it('Should send message to errors channel when rebound limit exceeded', function () {

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish']);

        amqp.sendRebound(new Error("Rebound error"), message);

        expect(amqp.publishChannel.publish).toHaveBeenCalled();
        expect(amqp.publishChannel.publish.callCount).toEqual(1);

        var args = amqp.publishChannel.publish.calls[0].args;
        expect(args[0]).toEqual(settings.PUBLISH_MESSAGES_TO);
        expect(args[1]).toEqual(settings.REBOUND_ROUTING_KEY);

        var payload = cipher.decryptMessageContent(args[2].toString());
        expect(payload).toEqual({content: 'Message content'});

        var options = args[3];
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

    it('Should disconnect from all channels and connection', function () {

        var amqp = new AMQPConnection(settings);
        amqp.subscribeChannel = jasmine.createSpyObj('subscribeChannel', ['close']);
        amqp.publishChannel = jasmine.createSpyObj('subscribeChannel', ['close']);
        amqp.amqp = jasmine.createSpyObj('amqp', ['close']);

        amqp.disconnect();

        expect(amqp.subscribeChannel.close.callCount).toEqual(1);
        expect(amqp.publishChannel.close.callCount).toEqual(1);
        expect(amqp.amqp.close.callCount).toEqual(1);
    });

});
