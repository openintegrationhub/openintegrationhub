describe('AMQP', function () {

    process.env.ELASTICIO_MESSAGE_CRYPTO_PASSWORD = 'testCryptoPassword';
    process.env.ELASTICIO_MESSAGE_CRYPTO_IV = 'iv=any16_symbols';

    var envVars = {};
    envVars.ELASTICIO_AMQP_URI = 'amqp://test2/test2';
    envVars.ELASTICIO_FLOW_ID = '5559edd38968ec0736000003';
    envVars.ELASTICIO_STEP_ID = 'step_1';
    envVars.ELASTICIO_EXEC_ID = 'some-exec-id';

    envVars.ELASTICIO_USER_ID = '5559edd38968ec0736000002';
    envVars.ELASTICIO_COMP_ID = '5559edd38968ec0736000456';
    envVars.ELASTICIO_FUNCTION = 'list';

    envVars.ELASTICIO_LISTEN_MESSAGES_ON = '5559edd38968ec0736000003:step_1:1432205514864:messages';
    envVars.ELASTICIO_PUBLISH_MESSAGES_TO = 'userexchange:5527f0ea43238e5d5f000001';
    envVars.ELASTICIO_DATA_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:message';
    envVars.ELASTICIO_ERROR_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:error';
    envVars.ELASTICIO_REBOUND_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:rebound';
    envVars.ELASTICIO_SNAPSHOT_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:snapshot';

    envVars.ELASTICIO_API_URI = 'http://apihost.com';
    envVars.ELASTICIO_API_USERNAME = 'test@test.com';
    envVars.ELASTICIO_API_KEY = '5559edd';

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
                execId: "exec1234567890",
                reply_to: "replyTo1234567890"
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

    beforeEach(function() {
        spyOn(encryptor, 'decryptMessageContent').andCallThrough();
    });

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

    it('Should sendHttpReply to outgoing channel using routing key from headers when process data', function () {

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish']);

        var msg = {
            statusCode: 200,
            headers: {
              'content-type': 'text/plain'
            },
            body: 'OK'
        };

        amqp.sendHttpReply(msg, {
            taskId : 'task1234567890',
            stepId : 'step_456',
            'X-EIO-Routing-Key': 'my-special-routing-key'
        });

        expect(amqp.publishChannel.publish).toHaveBeenCalled();
        expect(amqp.publishChannel.publish.callCount).toEqual(1);

        var publishParameters = amqp.publishChannel.publish.calls[0].args;
        expect(publishParameters[0]).toEqual(settings.PUBLISH_MESSAGES_TO);
        expect(publishParameters[1]).toEqual('my-special-routing-key');
        expect(publishParameters[2].toString()).toEqual(encryptor.encryptMessageContent(msg));
        expect(publishParameters[3]).toEqual({
            contentType : 'application/json',
            contentEncoding : 'utf8',
            mandatory : true,
            headers : {
                taskId : 'task1234567890',
                stepId : 'step_456',
                'X-EIO-Routing-Key': 'my-special-routing-key'
            }
        });

        var payload = encryptor.decryptMessageContent(publishParameters[2].toString());
        expect(payload).toEqual(msg);
    });

    it('Should throw errro in sendHttpReply if x-eio-routing-key header not found', function () {

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish']);

        var msg = {
            statusCode: 200,
            headers: {
              'content-type': 'text/plain'
            },
            body: 'OK'
        };

        expect(() => {
            amqp.sendHttpReply(msg, {
                taskId : 'task1234567890',
                stepId : 'step_456'
            });

        }).toThrow('Component emitted \'httpReply\' event but x-eio-routing-key was not found in AMQP headers');


        expect(amqp.publishChannel.publish).not.toHaveBeenCalled();
    });

    it('Should send message to outgoing channel using routing key from headers when process data', function () {

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish']);

        var msg = {
            headers: {
                'X-EIO-Routing-Key': 'my-special-routing-key'
            },
            body: {
                "content": "Message content"
            }
        };

        amqp.sendData(msg, {
            taskId : 'task1234567890',
            stepId : 'step_456'
        });

        expect(amqp.publishChannel.publish).toHaveBeenCalled();
        expect(amqp.publishChannel.publish.callCount).toEqual(1);

        var publishParameters = amqp.publishChannel.publish.calls[0].args;
        expect(publishParameters).toEqual([
            settings.PUBLISH_MESSAGES_TO,
            'my-special-routing-key',
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
        expect(payload).toEqual(msg);
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

    it('Should send message to errors using routing key from headers when process error', function () {

        var expectedErrorPayload = {
            error: {
                name: 'Error',
                message: 'Test error',
                stack: jasmine.any(String)
            },
            errorInput : {
                "content": "Message content"
            }
        };

        var amqp = new AMQPConnection(settings);
        amqp.publishChannel = jasmine.createSpyObj('publishChannel', ['publish']);

        amqp.sendError(new Error('Test error'), {
            taskId : 'task1234567890',
            stepId : 'step_456',
            'reply_to': 'my-special-routing-key'
        }, message.content);

        expect(amqp.publishChannel.publish).toHaveBeenCalled();
        expect(amqp.publishChannel.publish.callCount).toEqual(2);

        var publishParameters = amqp.publishChannel.publish.calls[0].args;
        expect(publishParameters.length).toEqual(4);
        expect(publishParameters[0]).toEqual(settings.PUBLISH_MESSAGES_TO);
        expect(publishParameters[1]).toEqual('5559edd38968ec0736000003:step_1:1432205514864:error');
        expect(publishParameters[3]).toEqual({
            contentType : 'application/json',
            contentEncoding : 'utf8',
            mandatory : true,
            headers : {
                taskId : 'task1234567890',
                stepId : 'step_456',
                'reply_to': 'my-special-routing-key'
            }
        });

        var payload = JSON.parse(publishParameters[2].toString());
        payload.error = encryptor.decryptMessageContent(payload.error);
        payload.errorInput = encryptor.decryptMessageContent(payload.errorInput);

        expect(payload).toEqual(expectedErrorPayload);


        publishParameters = amqp.publishChannel.publish.calls[1].args;
        expect(publishParameters.length).toEqual(4);
        expect(publishParameters[0]).toEqual(settings.PUBLISH_MESSAGES_TO);
        expect(publishParameters[1]).toEqual('my-special-routing-key');
        expect(publishParameters[3]).toEqual({
            contentType : 'application/json',
            contentEncoding : 'utf8',
            mandatory : true,
            headers : {
                taskId : 'task1234567890',
                stepId : 'step_456',
                'reply_to': 'my-special-routing-key',
                'x-eio-error-response' : true
            }
        });

        console.log('AND BACK')
        console.log(encryptor.decryptMessageContent("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"));

        payload = encryptor.decryptMessageContent(publishParameters[2].toString());

        expect(payload).toEqual(expectedErrorPayload.error);
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
        amqp.subscribeChannel = jasmine.createSpyObj('subscribeChannel', ['consume', 'prefetch']);
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
            expect(amqp.subscribeChannel.prefetch).toHaveBeenCalledWith(1);
            expect(clientFunction.callCount).toEqual(1);
            expect(clientFunction.calls[0].args[0]).toEqual(
                {
                    headers : {
                        reply_to : 'replyTo1234567890'
                    },
                    "content": "Message content"
                }
            );
            expect(clientFunction.calls[0].args[1]).toEqual(message);
            expect(clientFunction.calls[0].args[1].content).toEqual(encryptor.encryptMessageContent({"content": "Message content"}));

            expect(encryptor.decryptMessageContent).toHaveBeenCalledWith(message.content, message.properties.headers);
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
