describe('Web hook', () => {
    const { EventEmitter } = require('events');
    const commons = require('@elastic.io/commons');
    const { rabbitmqMsgCipher: cipher, errorReporter, mongo } = commons;
    const { Task, makeObjectId, RunningTask } = mongo;
    const WebHook = require('../lib/webhook.js').WebHook;
    const queues = require('../lib/queues');
    const init = require('../lib/init');
    const testHelpers = require('./helpers.js');

    const channel = {
        sendToQueue: null
    };

    let readChannel;

    const res = Object.assign(new EventEmitter(), {
        json: null,
        send: null,
        status: null,
        end: null,
        set: null,
        writeHead: null
    });

    let publishError;


    function createTask(serviceName, hmackey) {
        var result = {
            _id: '5220610c64d36a13ea000001',
            status: 'active',
            type: Task.TYPE_ORDINARY,
            orgId: makeObjectId(),
            user: '5220610c64d36a13ea000ddd',
            data: {
                step_1: {}
            },
            recipe: {
                nodes: [{
                    first: true,
                    compTitle: 'Webhook',
                    id: 'step_1',
                    function: 'receive',
                    compId: '55ba18e35d0404050000004'
                }, {
                    compTitle: 'Data mapper',
                    id: 'step_3',
                    function: 'map',
                    compId: 'mapper'
                }, {
                    service: serviceName,
                    compTitle: 'HTTP Reply',
                    id: 'step_2',
                    function: 'reply',
                    compId: '5707a7f14888d9070000006a'
                }],
                connections: [{
                    to: 'step_3',
                    from: 'step_1'
                }, {
                    to: 'step_2',
                    from: 'step_3'
                }]
            }
        };

        if (hmackey) {
            result.data.step_1.hmac_key = hmackey;
        }

        return new Task(result);
    }
    let task;

    function createRequest(opts) {
        const options = opts || {};

        if (!options.body) {
            options.body = {
                foo: 'bar'
            };
        }

        if (!options['content-type']) {
            options['content-type'] = 'application/json';
        }

        const { body } = options;

        const req = Object.assign(new EventEmitter(), {
            id: 'my-request-12345',
            params: {
                taskId: '5220610c64d36a13ea000001'
            },
            route: {
                keys: {}
            },
            headers: {
                'content-type': options['content-type']
            },
            url: '/hook/5220610c64d36a13ea000001',
            path: '/hook/5220610c64d36a13ea000001',
            method: 'POST',
            originalUrl: '/hook/5220610c64d36a13ea000001',
            query: {},
            body,
            rawBody: Buffer.from(JSON.stringify(body), 'utf8')
        });

        if (options.files) {
            req.files = options.files;
        }

        if (!options.taskNotFound) {
            req.task = task;
        }

        if (options.signature) {
            req.headers['x-eio-signature'] = options.signature;
        }
        return req;
    }

    beforeEach(async () => {
        const configStub = testHelpers.buildFakeConfig();
        spyOn(init, 'getConfig').and.returnValue(configStub);
        await mongo.connect(configStub.get('MONGO_URI'));
        task = createTask();
        readChannel = {};//jasmine.createSpyObj('readChannel', ['consume', 'cancel']);
        readChannel.assertExchange = () => null; 
        readChannel.sendToQueue = () => null; 
        readChannel.consume = () => null; 
        readChannel.cancel = () => null; 
        readChannel.assertQueue = () => null; 
        readChannel.bindQueue = () => null; 
        spyOn(readChannel, 'assertExchange').and.returnValue(Promise.resolve());
        spyOn(readChannel, 'sendToQueue').and.returnValue(Promise.resolve());
        spyOn(readChannel, 'consume').and.returnValue(Promise.resolve());
        spyOn(readChannel, 'cancel').and.returnValue(Promise.resolve());
        spyOn(readChannel, 'assertQueue').and.returnValue(Promise.resolve());
        spyOn(readChannel, 'bindQueue').and.returnValue(Promise.resolve());

        spyOn(errorReporter, 'report').and.callThrough();

        spyOn(RunningTask, 'ensureRecord').and.callThrough();

        spyOn(channel, 'sendToQueue').and.callFake(() => {
            if (publishError) {
                throw publishError;
            }
            return;
        });

        const noop = () => true;
        spyOn(res, 'json').and.callFake(noop);
        spyOn(res, 'send').and.callFake(noop);
        spyOn(res, 'end').and.callFake(noop);
        spyOn(res, 'set').and.returnValue(res);
        spyOn(res, 'status').and.returnValue(res);
        spyOn(res, 'writeHead').and.returnValue(noop);
    });

    afterEach(() => {
        publishError = null;
    });

    it('verify web hook data', async () => {
        const req = createRequest();
        await new WebHook(readChannel, channel).verify(req, res);
        expect(res.writeHead).toHaveBeenCalledWith(200);
        expect(res.end).toHaveBeenCalled();
    });

    it('verify web hook fails task does not exist', async () => {
        const req = createRequest({
            taskNotFound: true
        });
        await new WebHook(readChannel, channel, {
            antihack_delay: 10
        }).verify(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Task 5220610c64d36a13ea000001 either does not exist or is inactive'
        });
    });

    it('handle web hook data fails because pushing message to queue fails', async () => {
        publishError = new Error('Queue unavailable');

        const req = createRequest();
        await new WebHook(readChannel, channel).handle(req, res);
        expect(channel.sendToQueue).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Queue unavailable'
        });
    });

    it('handle web hook data fails because task does not exist', async () => {
        const req = createRequest({
            taskNotFound: true
        });
        await new WebHook(readChannel, channel, {
            antihack_delay: 10
        }).handle(req, res);

        expect(channel.sendToQueue).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Task 5220610c64d36a13ea000001 either does not exist or is inactive.'
        });
    });

    it('handle web hook data', async () => {
        const req = createRequest();
        const hook = new WebHook(readChannel, channel);

        await hook.handle(req, res);

        expect(channel.sendToQueue).toHaveBeenCalled();

        const args = channel.sendToQueue.calls.argsFor(0);

        expect(args[0]).toEqual(`${task.orgId}:${task.id}/${task.type}:step_1:messages`);

        const  payloadContent = args[1].toString();
        const  payload = JSON.parse(cipher.getCurrentCipher().decrypt(payloadContent));

        expect(payload.attachments).toEqual({});
        expect(payload.headers).toEqual({
            'content-type': 'application/json'
        });
        expect(payload.body).toEqual({
            foo: 'bar'
        });
        expect(payload.query).toEqual({});
        expect(payload.params).toEqual({});
        expect(payload.taskId).toEqual('5220610c64d36a13ea000001');
        expect(payload.url).toEqual('/hook/5220610c64d36a13ea000001');
        expect(payload.method).toEqual('POST');
        expect(payload.originalUrl).toEqual('/hook/5220610c64d36a13ea000001');

        expect(RunningTask.ensureRecord).toHaveBeenCalledWith(task);
        const runningTask = await RunningTask.ensureRecord(task);

        expect(args[2]).toEqual({
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                'taskId': '5220610c64d36a13ea000001',
                'userId': '5220610c64d36a13ea000ddd',
                'execId': runningTask.execId,
                'type': Task.TYPE_ORDINARY,
                'status': 'active',
                'x-eio-meta-trace-id': jasmine.any(String),
                'messageId': jasmine.any(String)
            }
        });

        expect(res.set).toHaveBeenCalledWith({
            'Content-Type': 'application/json'
        });
        expect(res.send).toHaveBeenCalledWith({
            requestId: 'my-request-12345',
            message: 'thank you'
        });
    });

    it('handle web hook data for GET requests', async () => {
        const req = Object.assign(new EventEmitter(), {
            id: 'my-request-12345',
            params: {
                taskId: '5220610c64d36a13ea000001'
            },
            url: '/hook/5220610c64d36a13ea000001',
            path: '/hook/5220610c64d36a13ea000001',
            method: 'GET',
            originalUrl: '/hook/5220610c64d36a13ea000001',
            query: {
                foo: 'foo val',
                bar: 'bar val'
            },
            route: {
                keys: {}
            },
            headers: {
                'host': 'in-flint.elastic.io',
                'x-real-ip': '109.90.193.132',
                'x-forwarded-for': '109.90.193.132, 10.14.250.24',
                'x-forwarded-proto': 'https'
            },
            task: task
        });

        const hook = new WebHook(readChannel, channel);

        await hook.handle(req, res);


        expect(channel.sendToQueue).toHaveBeenCalled();
        const args = channel.sendToQueue.calls.argsFor(0);

        expect(args[0]).toEqual(`${task.orgId}:${task.id}/${task.type}:step_1:messages`);

        const payloadContent = args[1].toString();
        const payload = JSON.parse(cipher.getCurrentCipher().decrypt(payloadContent));

        expect(payload.attachments).toEqual({});
        expect(payload.headers).toEqual({
            'host': 'in-flint.elastic.io',
            'x-real-ip': '109.90.193.132',
            'x-forwarded-for': '109.90.193.132, 10.14.250.24',
            'x-forwarded-proto': 'https'
        });
        expect(payload.body).toEqual({
            foo: 'foo val',
            bar: 'bar val'
        });
        expect(payload.query).toEqual({
            foo: 'foo val',
            bar: 'bar val'
        });
        expect(payload.params).toEqual({});
        expect(payload.taskId).toEqual('5220610c64d36a13ea000001');
        expect(payload.url).toEqual('/hook/5220610c64d36a13ea000001');
        expect(payload.method).toEqual('GET');
        expect(payload.originalUrl).toEqual('/hook/5220610c64d36a13ea000001');
        expect(payload.pathSuffix).toEqual('');

        expect(RunningTask.ensureRecord).toHaveBeenCalledWith(task);
        const runningTask = await RunningTask.ensureRecord(task);
        
        expect(args[2]).toEqual({
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                'taskId': '5220610c64d36a13ea000001',
                'userId': '5220610c64d36a13ea000ddd',
                'execId': runningTask.execId,
                'type': Task.TYPE_ORDINARY,
                'status': 'active',
                'x-eio-meta-trace-id': jasmine.any(String),
                'messageId': jasmine.any(String)
            }
        });

        expect(res.set).toHaveBeenCalledWith({
            'Content-Type': 'application/json'
        });
        expect(res.send).toHaveBeenCalledWith({
            requestId: 'my-request-12345',
            message: 'thank you'
        });
    });

    describe('handle web hook data with pathSuffix', () => {
        describe('when url ends with "/"', () => {
            it('should get "/" from url', async () => {
                const hook = new WebHook(readChannel, channel);
                
                const req = createRequest();
                req.path += "/";
                await hook.handle(req, res);

                expect(channel.sendToQueue).toHaveBeenCalled();
                const args = channel.sendToQueue.calls.argsFor(0);

                const payloadContent = args[1].toString();
                const payload = JSON.parse(cipher.getCurrentCipher().decrypt(payloadContent));
                expect(payload.pathSuffix).toEqual('/');
            });
        });

        describe('when url ends with "/foo"', () => {
            it('should get "/foo" from url', async () => {
                const hook = new WebHook(readChannel, channel);
                
                const req = createRequest();
                req.path += "/foo";
                await hook.handle(req, res);

                expect(channel.sendToQueue).toHaveBeenCalled();
                const args = channel.sendToQueue.calls.argsFor(0);

                const payloadContent = args[1].toString();
                const payload = JSON.parse(cipher.getCurrentCipher().decrypt(payloadContent));
                expect(payload.pathSuffix).toEqual('/foo');
            });
        });

        describe('when url ends with "/foo/bar"', () => {
            it('should get "/foo/bar" from url', async () => {
                const hook = new WebHook(readChannel, channel);
                
                const req = createRequest();
                req.path += "/foo/bar";
                await hook.handle(req, res);

                expect(channel.sendToQueue).toHaveBeenCalled();
                const args = channel.sendToQueue.calls.argsFor(0);

                const payloadContent = args[1].toString();
                const payload = JSON.parse(cipher.getCurrentCipher().decrypt(payloadContent));
                expect(payload.pathSuffix).toEqual('/foo/bar');
            });
        });

        describe('when url has with "/foo/bar" but also GET params', () => {
            it('should get "/foo/bar" from url', async () => {
                const hook = new WebHook(readChannel, channel);
                
                const req = Object.assign(new EventEmitter(), {
                    id: 'my-request-12345',
                    params: {
                        taskId: '5220610c64d36a13ea000001'
                    },
                    url: '/hook/5220610c64d36a13ea000001/foo/bar?foo=fooval&bar=barval',
                    path: '/hook/5220610c64d36a13ea000001/foo/bar',
                    method: 'GET',
                    originalUrl: '/hook/5220610c64d36a13ea000001/foo/bar?foo=fooval&bar=barval',
                    query: {
                        foo: 'fooval',
                        bar: 'barval'
                    },
                    route: {
                        keys: {}
                    },
                    headers: {
                        'host': 'in-flint.elastic.io',
                        'x-real-ip': '109.90.193.132',
                        'x-forwarded-for': '109.90.193.132, 10.14.250.24',
                        'x-forwarded-proto': 'https'
                    },
                    task: task
                });
                await hook.handle(req, res);

                expect(channel.sendToQueue).toHaveBeenCalled();
                const args = channel.sendToQueue.calls.argsFor(0);

                const payloadContent = args[1].toString();
                const payload = JSON.parse(cipher.getCurrentCipher().decrypt(payloadContent));
                expect(payload.pathSuffix).toEqual('/foo/bar');
            });
        });
    });

    it('handle request-response', async () => {
        let traceId;
        task = createTask('request-reply');
        spyOn(task, 'toSchedulerRecord').and.callFake(() => {
            const record = Task.prototype.toSchedulerRecord.call(task); 
            traceId = record['x-eio-meta-trace-id'];
            return record;
        });
        spyOn(queues, 'prepareReplyQueue').and.returnValue({
            assertExchange: () => Promise.resolve(1),
            assertQueue: () => Promise.resolve(1),
            bindQueue: () => Promise.resolve(1)
        });
        spyOn(queues, 'consumeFromReplyQueue').and.returnValue({
            cancel: jasmine.createSpy(),
            promise: Promise.resolve({
                body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                headers: {
                    'Content-Type': 'application/xml'
                }
            })
        });

        const req = createRequest();
        const hook = new WebHook(readChannel, channel);

        await hook.handle(req, res);

        expect(queues.consumeFromReplyQueue).toHaveBeenCalled();
        expect(queues.prepareReplyQueue).toHaveBeenCalled();
        expect(channel.sendToQueue).toHaveBeenCalled();

        const args = channel.sendToQueue.calls.argsFor(0);

        expect(args[0]).toEqual(`${task.orgId}:${task.id}/${task.type}:step_1:messages`);

        const payloadContent = args[1].toString();
        const payload = JSON.parse(cipher.getCurrentCipher().decrypt(payloadContent));

        expect(payload.attachments).toEqual({});
        expect(payload.headers).toEqual({
            'content-type': 'application/json'
        });
        expect(payload.body).toEqual({
            foo: 'bar'
        });
        expect(payload.query).toEqual({});
        expect(payload.params).toEqual({});
        expect(payload.taskId).toEqual('5220610c64d36a13ea000001');
        expect(payload.url).toEqual('/hook/5220610c64d36a13ea000001');
        expect(payload.method).toEqual('POST');
        expect(payload.originalUrl).toEqual('/hook/5220610c64d36a13ea000001');
        expect(payload.pathSuffix).toEqual('');

        expect(RunningTask.ensureRecord).toHaveBeenCalledWith(task);
        const runningTask = await RunningTask.ensureRecord(task);

        expect(args[2]).toEqual({
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                'taskId': '5220610c64d36a13ea000001',
                'userId': '5220610c64d36a13ea000ddd',
                'execId': runningTask.execId,
                'type': Task.TYPE_ORDINARY,
                'status': 'active',
                'reply_to': `request_reply_key_${traceId}`,
                'x-eio-meta-trace-id': jasmine.any(String),
                'messageId': jasmine.any(String)
            }
        });

        expect(res.set).toHaveBeenCalledWith({
            'Content-Type': 'application/xml'
        });
        expect(res.send).toHaveBeenCalledWith(
            '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
        );

        expect(channel.sendToQueue).toHaveBeenCalled();
    });

    it('refuse request without HMAC signature if key is present in task', async () => {
        task = createTask('', 'my-hmac-key');
        const req = createRequest({
            signature: 'abc'
        });
        const hook = new WebHook(readChannel, channel, {
            antihack_delay: 10
        });

        await hook.handle(req, res);

        expect(channel.sendToQueue).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: 'The provided request signature does not match. Please check your signature key' // eslint-disable-line max-len
        });
    });

    it('check HMAC signature of the request', async () => {
        task = createTask('', 'mykey');
        const req = createRequest({
            signature: 'bba103420a74c537b95b00c67bcec04fd11ac1047057e0487af2a5b4ec3d9e4096cfa3530b7e56b7753fbf7a75bbcc972d1f47657b3061071fbfcd072474d4fd', // eslint-disable-line max-len
            body: {
                hi: 'there'
            }
        });
        const hook = new WebHook(readChannel, channel);

        await hook.handle(req, res);

        expect(res.send).toHaveBeenCalled();
        expect(channel.sendToQueue).toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith({
            requestId: 'my-request-12345',
            message: 'thank you'
        });
    });

    it('check presense HMAC header in the request if task has hmac key', async () => {
        task = createTask('', 'my-hmac-key');
        const req = createRequest();
        const hook = new WebHook(readChannel, channel, {
            antihack_delay: 10
        });

        await hook.handle(req, res);

        expect(channel.sendToQueue).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: 'The request is expected to be signed. Please send the signature using the x-eio-signature HTTP header' // eslint-disable-line max-len
        });
    });

    it('fail with proper error if request has no body or rawBody property on the request is not set', async () => {
        task = createTask('', 'my-hmac-key');
        const req = createRequest();
        delete req.rawBody;
        const hook = new WebHook(readChannel, channel, {
            antihack_delay: 10
        });

        await hook.handle(req, res);

        expect(channel.sendToQueue).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: 'The request is expected to be signed. Please send the signature using the x-eio-signature HTTP header' // eslint-disable-line max-len
        });
    });

});
