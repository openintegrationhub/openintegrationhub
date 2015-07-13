describe('AMQP', function () {

    process.env.MESSAGE_CRYPTO_PASSWORD = 'testCryptoPassword';
    process.env.MESSAGE_CRYPTO_IV = 'iv=any16_symbols';

    var envVars = {};
    envVars.AMQP_URI = 'amqp://test2/test2';
    envVars.TASK = '{"_id":"5559edd38968ec0736000003","data":{"step_1":{"account":"1234567890"}},"recipe":{"nodes":[{"id":"step_1","function":"list"}]}}';
    envVars.STEP_ID = 'step_1';

    envVars.LISTEN_MESSAGES_ON = '5559edd38968ec0736000003:step_1:1432205514864:messages';
    envVars.PUBLISH_MESSAGES_TO = 'userexchange:5527f0ea43238e5d5f000001';
    envVars.DATA_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:message';
    envVars.ERROR_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:error';
    envVars.REBOUND_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:rebound';
    envVars.SNAPSHOT_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:snapshot';

    var AMQPConnection = require('../lib/amqp.js').AMQPConnection;
    var settings = require('../lib/settings.js').readFrom(envVars);
    var encryptor = require('../lib/encryptor.js');
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
                execId: "exec1234567890"
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
        content: encryptor.encryptMessageContent({"content": "Message content"})
    };

    it('Should send message to outgoing channel when process data', function () {

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish']);

        amqp.sendData({"content": "Message content"}, {
            taskId : 'task1234567890',
            stepId : 'step_456'
        });

        expect(amqp.publishChannel.publish).toHaveBeenCalled();
        expect(amqp.publishChannel.publish.callCount).toEqual(1);

        var publishParameters = amqp.publishChannel.publish.calls[0].args;
        expect(publishParameters).toEqual([
            settings.PUBLISH_MESSAGES_TO,
            settings.DATA_ROUTING_KEY,
            jasmine.any(Object),
            {
                contentType : 'application/json',
                contentEncoding : 'utf8',
                mandatory : true,
                headers : {
                    taskId : 'task1234567890',
                    stepId : 'step_456'
                }
            }
        ]);

        var payload = encryptor.decryptMessageContent(publishParameters[2].toString());
        expect(payload).toEqual({ content : 'Message content' });
    });

    it('Should send message to errors when process error', function () {

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish']);

        amqp.sendError(new Error('Test error'), {
            taskId : 'task1234567890',
            stepId : 'step_456'
        }, message.content);

        expect(amqp.publishChannel.publish).toHaveBeenCalled();
        expect(amqp.publishChannel.publish.callCount).toEqual(1);

        var publishParameters = amqp.publishChannel.publish.calls[0].args;
        expect(publishParameters).toEqual([
            settings.PUBLISH_MESSAGES_TO,
            settings.ERROR_ROUTING_KEY,
            jasmine.any(Object),
            {
                contentType : 'application/json',
                contentEncoding : 'utf8',
                mandatory : true,
                headers : {
                    taskId : 'task1234567890',
                    stepId : 'step_456'
                }
            }
        ]);

        var payload = JSON.parse(publishParameters[2].toString());
        payload.error = encryptor.decryptMessageContent(payload.error);
        payload.errorInput = encryptor.decryptMessageContent(payload.errorInput);

        expect(payload).toEqual({
            error: {
                name: 'Error',
                message: 'Test error',
                stack: jasmine.any(String)
            },
            errorInput : {
                "content": "Message content"
            }
        });
    });

    it('Should not provide errorInput if errorInput was empty', function () {

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish']);

        amqp.sendError(new Error('Test error'), {
            taskId : 'task1234567890',
            stepId : 'step_456'
        }, '');

        expect(amqp.publishChannel.publish).toHaveBeenCalled();
        expect(amqp.publishChannel.publish.callCount).toEqual(1);

        var publishParameters = amqp.publishChannel.publish.calls[0].args;
        var payload = JSON.parse(publishParameters[2].toString());
        payload.error = encryptor.decryptMessageContent(payload.error);

        expect(payload).toEqual({
            error: {
                name: 'Error',
                message: 'Test error',
                stack: jasmine.any(String)
            }
            // no errorInput should be here
        });
    });

    it('Should not provide errorInput if errorInput was null', function () {

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish']);

        amqp.sendError(new Error('Test error'), {
            taskId : 'task1234567890',
            stepId : 'step_456'
        }, null);

        expect(amqp.publishChannel.publish).toHaveBeenCalled();
        expect(amqp.publishChannel.publish.callCount).toEqual(1);

        var publishParameters = amqp.publishChannel.publish.calls[0].args;
        var payload = JSON.parse(publishParameters[2].toString());
        payload.error = encryptor.decryptMessageContent(payload.error);

        expect(payload).toEqual({
            error: {
                name: 'Error',
                message: 'Test error',
                stack: jasmine.any(String)
            }
            // no errorInput should be here
        });
    });

    it('Should send message to rebounds when rebound happened', function () {

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish']);

        var outgoingMessageHeaders = {
            execId: "exec1234567890",
            taskId: "task1234567890",
            stepId: 'step_1',
            compId: "comp1",
            function: "list",
            start: "1432815685034"
        };

        amqp.sendRebound(new Error("Rebound error"), message, outgoingMessageHeaders);

        expect(amqp.publishChannel.publish).toHaveBeenCalled();
        expect(amqp.publishChannel.publish.callCount).toEqual(1);

        var publishParameters = amqp.publishChannel.publish.calls[0].args;
        expect(publishParameters).toEqual([
            settings.PUBLISH_MESSAGES_TO,
            settings.REBOUND_ROUTING_KEY,
            jasmine.any(Object),
            {
                contentType : 'application/json',
                contentEncoding : 'utf8',
                mandatory : true,
                expiration : 15000,
                headers : {
                    execId : 'exec1234567890',
                    taskId : 'task1234567890',
                    stepId : 'step_1',
                    compId : 'comp1',
                    function : 'list',
                    start : '1432815685034',
                    reboundIteration : 1
                }
            }
        ]);

        var payload = encryptor.decryptMessageContent(publishParameters[2].toString());
        expect(payload).toEqual({content: 'Message content'});
    });

    it('Should send message to rebounds with reboundIteration=3', function () {

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish']);

        var outgoingMessageHeaders = {
            execId: "exec1234567890",
            taskId: "task1234567890",
            stepId: 'step_1',
            compId: "comp1",
            function: "list",
            start: "1432815685034"
        };

        var clonedMessage = _.cloneDeep(message);
        clonedMessage.properties.headers.reboundIteration = 2;

        amqp.sendRebound(new Error("Rebound error"), clonedMessage, outgoingMessageHeaders);

        expect(amqp.publishChannel.publish).toHaveBeenCalled();
        expect(amqp.publishChannel.publish.callCount).toEqual(1);

        var publishParameters = amqp.publishChannel.publish.calls[0].args;
        expect(publishParameters).toEqual([
            settings.PUBLISH_MESSAGES_TO,
            settings.REBOUND_ROUTING_KEY,
            jasmine.any(Object),
            {
                contentType : 'application/json',
                contentEncoding : 'utf8',
                mandatory : true,
                expiration : 60000,
                headers : {
                    execId : 'exec1234567890',
                    taskId : 'task1234567890',
                    stepId : 'step_1',
                    compId : 'comp1',
                    function : 'list',
                    start : '1432815685034',
                    reboundIteration : 3
                }
            }
        ]);

        var payload = encryptor.decryptMessageContent(publishParameters[2].toString());
        expect(payload).toEqual({content: 'Message content'});
    });

    it('Should send message to errors when rebound limit exceeded', function () {

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish']);

        var outgoingMessageHeaders = {
            execId: "exec1234567890",
            taskId: "task1234567890",
            stepId: 'step_1',
            compId: "comp1",
            function: "list",
            start: "1432815685034"
        };

        var clonedMessage = _.cloneDeep(message);
        clonedMessage.properties.headers.reboundIteration = 100;

        amqp.sendRebound(new Error("Rebound error"), clonedMessage, outgoingMessageHeaders);

        expect(amqp.publishChannel.publish).toHaveBeenCalled();
        expect(amqp.publishChannel.publish.callCount).toEqual(1);

        var publishParameters = amqp.publishChannel.publish.calls[0].args;
        expect(publishParameters).toEqual([
            settings.PUBLISH_MESSAGES_TO,
            settings.ERROR_ROUTING_KEY,
            jasmine.any(Object),
            {
                contentType : 'application/json',
                contentEncoding : 'utf8',
                mandatory : true,
                headers : {
                    execId: "exec1234567890",
                    taskId: "task1234567890",
                    stepId: 'step_1',
                    compId: "comp1",
                    function: "list",
                    start: "1432815685034"
                }
            }
        ]);

        var payload = JSON.parse(publishParameters[2].toString());
        console.log(payload);
        payload.error = encryptor.decryptMessageContent(payload.error);
        payload.errorInput = encryptor.decryptMessageContent(payload.errorInput);

        expect(payload.error.message).toEqual('Rebound limit exceeded');
        expect(payload.errorInput).toEqual({content : 'Message content'});
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
        amqp.reject(message);

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
            expect(clientFunction.calls[0].args[1].content).toEqual(encryptor.encryptMessageContent({"content": "Message content"}));
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
