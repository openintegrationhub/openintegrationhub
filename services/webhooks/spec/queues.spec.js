describe('Queues', () => {
    const Q = require('q');
    const uuid = require('uuid');

    const commons = require('@elastic.io/commons');
    const { Task } = commons.mongo;
    const cipher = commons.rabbitmqMsgCipher.getCurrentCipher();

    const queues = require('../lib/queues');
    const init = require('../lib/init');
    const testHelpers = require('./helpers.js');

    const channel = {
        assertExchange: null,
        assertQueue: null,
        bindQueue: null,
        consume: null,
        cancel: null
    };

    const task = {
        user: '55ba18e35d04040500000004'
    };
    const execId = 'my_Exec_123';
    let uuidValue;

    beforeEach(() => {
        const configStub = testHelpers.buildFakeConfig();
        spyOn(init, 'getConfig').and.returnValue(configStub);
        spyOn(cipher, 'decrypt').and.callFake(input => input);

        spyOn(channel, 'assertExchange').and.callFake(() => Q());

        spyOn(channel, 'assertQueue').and.callFake(() => Q());

        spyOn(channel, 'bindQueue').and.callFake(() => Q());

        spyOn(channel, 'cancel').and.callFake(() => Q());
        uuidValue = Math.random();
        spyOn(uuid, 'v4').and.returnValue(uuidValue);
    });

    it('should create reply queue successfully', async () => {
        let steps = queues.prepareReplyQueue(channel, task, execId);
        await steps.assertExchange();
        await steps.assertQueue();
        await steps.bindQueue();
        expect(channel.assertExchange).toHaveBeenCalledWith(
            '55ba18e35d04040500000004_user',
            'topic',
            {
                durable: true,
                autoDelete: false
            }
        );

        expect(channel.assertQueue).toHaveBeenCalledWith(
            'request_reply_queue_my_Exec_123',
            {
                durable: true,
                exclusive: true,
                autoDelete: true,
                expires: 60000
            }
        );

        expect(channel.bindQueue).toHaveBeenCalledWith(
            'request_reply_queue_my_Exec_123',
            '55ba18e35d04040500000004_user',
            'request_reply_key_my_Exec_123'
        );
    });

    it('should consume from reply queue successfully', async () => {
        spyOn(channel, 'consume').and.callFake((queueName, handler) => {
            handler({
                content: JSON.stringify({
                    headers: {
                        'X-Test-Header': 'test-header'
                    },
                    body: {
                        message: 'Hello, world!'
                    }
                }),
                properties: {
                    headers: {}
                }
            });
        });

        const result = await queues.consumeFromReplyQueue(channel, execId).promise;
        expect(result).toEqual({
            body: {
                message: 'Hello, world!'
            },
            headers: {
                'content-type': 'application/json',
                'x-test-header': 'test-header'
            }
        });

        expect(cipher.decrypt).toHaveBeenCalled();

        expect(channel.consume).toHaveBeenCalledWith(
            'request_reply_queue_my_Exec_123',
            jasmine.any(Function),
            {
                noAck: true,
                consumerTag: `my_Exec_123_${uuidValue}`
            }
        );

        expect(channel.cancel).toHaveBeenCalledWith(
            `my_Exec_123_${uuidValue}`
        );
    });

    it('should consume error message from reply queue successfully', async () => {
        spyOn(channel, 'consume').and.callFake((queueName, handler) => {
            handler({
                content: JSON.stringify({
                    message: 'Ouch!',
                    stack: 'A stack'
                }),
                properties: {
                    headers: {
                        'stepId': 'step_4',
                        'compId': 'mapper',
                        'function': 'map',
                        'x-eio-error-response': true
                    }
                }
            });
        });

        const result = await queues.consumeFromReplyQueue(channel, execId).promise;

        expect(result).toEqual({
            body: {
                message: 'Component mapper failed when executing function map (step=step_4)',
                error: {
                    message: 'Ouch!',
                    stack: 'A stack'
                }
            },
            headers: {
                'Content-Type': 'application/json'
            }
        });

        expect(cipher.decrypt).toHaveBeenCalled();

        expect(channel.consume).toHaveBeenCalledWith(
            'request_reply_queue_my_Exec_123',
            jasmine.any(Function),
            {
                noAck: true,
                consumerTag: `my_Exec_123_${uuidValue}`
            }
        );

        expect(channel.cancel).toHaveBeenCalledWith(
            `my_Exec_123_${uuidValue}`
        );
    });

    it('should fail when consuming invalid message', async () => {

        spyOn(channel, 'consume').and.callFake((queueName, handler) => {
            handler({
                content: 'invalid-json',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        });
        let caughtError;
        try {
            await queues.consumeFromReplyQueue(channel, execId).promise;
        } catch (e) {    
            caughtError = e;
        }

        expect(caughtError.message.startsWith('Unexpected token i')).toBeTruthy();

        expect(cipher.decrypt).toHaveBeenCalled();

        expect(channel.consume).toHaveBeenCalledWith(
            'request_reply_queue_my_Exec_123',
            jasmine.any(Function),
            {
                noAck: true,
                consumerTag: `my_Exec_123_${uuidValue}`
            }
        );

        expect(channel.cancel).toHaveBeenCalledWith(
            `my_Exec_123_${uuidValue}`
        );
    });
    describe('#getUserExchangeName', () => {
        it('should work for task with missing stepsRoutingVersion', () => {
            const task = new Task({
                orgId: commons.mongo.makeObjectId(),
                user: commons.mongo.makeObjectId(),
                slugPassword: 'bla-bla-bla',
                stepsRoutingVersion: null
            });
            expect(queues.getUserExchangeName(task)).toEqual(`${task.user}_user`);
        });
        it('should work for task with stepsRoutingVersion=1', () => {
            const task = new Task({
                orgId: commons.mongo.makeObjectId(),
                user: commons.mongo.makeObjectId(),
                slugPassword: 'bla-bla-bla',
                stepsRoutingVersion: 1
            });
            expect(queues.getUserExchangeName(task)).toEqual(`${task.user}_user`);
        });
        it('should work for task with stepsRoutingVersion=2', () => {
            const task = new Task({
                orgId: commons.mongo.makeObjectId(),
                user: commons.mongo.makeObjectId(),
                slugPassword: 'bla-bla-bla',
                stepsRoutingVersion: 2
            });
            expect(queues.getUserExchangeName(task)).toEqual(`${task.orgId}_org`);
        });
    });
});
