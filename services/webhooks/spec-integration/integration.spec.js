//FIXME @see https://github.com/elasticio/commons/issues/811
/*eslint no-console:0*/
process.env.ENVIRONMENT = 'integration_test';
const fs = require('fs');
const crypto = require('crypto');

const _ = require('lodash');

const nock = require('nock');
const assert = require('chai').assert;
const supertest = require('supertest');

const amqplib = require('amqplib');
const typeis = require('type-is');

const commons = require('@elastic.io/commons');
const { amqp } = require('@elastic.io/commons');
const { Task, RequestBin, Account } = commons.mongo;
const env = commons.env;
const testHelpers = commons.testHelpers;

const hooks = require('../lib/hooks.js');
const queues = require('../lib/queues.js');
const init = require('../lib/init');

const taskJson = require('./webhook_task.json');
const configHelpers = require('../spec/helpers.js');

describe('Integration Test', () => {
    let rabbit;
    let requestId;

    let org;
    let tenant;
    let user;
    let contract;

    let app;

    function delay(duration) {
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    before(async () => {
        const configStub = configHelpers.buildFakeConfig();
        init.getConfig = () => configStub;
        await init.init();

        app = await hooks.createApp();
        await testHelpers.clearDB();
        tenant = await testHelpers.ensureTenant({
            name: 'just a tenant',
            domain: 'test',
            code: 'dontbotherme'
        }, true);

        contract = await testHelpers.ensureContract({
            name: 'just a contract',
            tenantId: tenant._id
        });

        org = await testHelpers.ensureOrganization({
            name: 'just an org',
            tenantId: tenant._id,
            contractId: contract._id,
            slugPassword: 'meainigless_random_password'
        }, true);

        user = await testHelpers.ensureUser({
            email: 'dont@send.me.mail.com',
            tenantId: tenant._id,
            role: 'tenantAdmin'
        }, true);
        org.join(user._id);
        await org.save();

        rabbit = require('rabbitmq-stats')(
            process.env.RABBITMQ_STATS_URI,
            process.env.RABBITMQ_STATS_LOGIN,
            process.env.RABBITMQ_STATS_PASS
        );

    });

    after(async () => {
        await testHelpers.clearDB();
    });

    beforeEach(() => {
        // Here we'll fake some Steward functionality for testing
        nock(process.env.STEWARD_URI)
            .post('/files')
            .reply(200, {
                get_url: 'http://foo.marathon.mesos:8091/files/e8b059a0-f2c2-40f3-9836-6d0dc466cb7a',
                put_url: `${process.env.STEWARD_URI}/files/put`
            })
            .put('/files/put')
            .reply(200, {
                message: 'ok'
            });
    });

    describe('/', () => {
        it('should return unknown version', () =>
            supertest(app)
                .get('/')
                .expect({
                    version: 'unknown'
                })
        );
    });

    function assertSuccessResponseBody(res) {
        assert.equal(res.body.message, 'thank you');

        requestId = res.body.requestId;
        assert(!!requestId, 'requestId is not set');
    }

    describe('/hook/:taskId', () => {

        async function getRequestBin() {
            let bin;
            let i = 0;
            const MAX_ATTEMPTS = 10;
            await delay(100);
            do {
                bin = await RequestBin.findOne({
                    requestId
                });
                if (bin) {
                    return bin;
                }
                await delay(1000);
            } while (!bin && ++i < MAX_ATTEMPTS);
        }

        function assertRequestBin(taskId, method, contentType, body) {
            return getRequestBin()
                .then((bin) => {
                    assert(!!bin, 'RequestBin not found');
                    assert.equal(bin.taskId.toString(), taskId.toString());
                    assert.equal(bin.method, method);

                    const expectedContentType = typeis.is(bin.headers['content-type']);

                    assert.equal(contentType, expectedContentType);

                    let actualBody = bin.body;
                    //if bin.body is binary
                    if (bin.body._bsontype && bin.body._bsontype === 'Binary') {
                        actualBody = bin.body.toString();

                        //if bin.body should be object
                        if (typeof body === 'object') {
                            actualBody = JSON.parse(actualBody);
                        }
                    }
                    assert.deepEqual(actualBody, body);

                    assert.equal(bin.url, `/hook/${taskId}`);

                    return bin;
                });
        }

        let taskActive;
        let taskSuspended;
        let taskDeleted;
        let taskInactive;
        let taskStarting;
        let taskStopping;
        let taskInactiveToActive;
        let taskSuspendedToActive;
        let taskActiveToActive;

        before(async () => {
            taskJson.orgId = org._id;
            taskActive = await testHelpers.ensureTask(Object.assign(taskJson, {
                currentStatus: Task.CURRENT_STATUS_ACTIVE
            }));

            taskInactive = await testHelpers.ensureTask(Object.assign(taskJson, {
                status: Task.STATUS_INACTIVE
            }));
            taskDeleted = await testHelpers.ensureTask(Object.assign(taskJson, {
                status: Task.STATUS_DELETED
            }));
            taskSuspended = await testHelpers.ensureTask(Object.assign(taskJson, {
                status: Task.STATUS_SUSPENDED
            }));
            taskStarting = await testHelpers.ensureTask(Object.assign(taskJson, {
                status: Task.STATUS_STARTING
            }));
            taskStopping = await testHelpers.ensureTask(Object.assign(taskJson, {
                status: Task.STATUS_STOPPING
            }));
            taskInactiveToActive = await testHelpers.ensureTask(Object.assign(taskJson, {
                status: Task.STATUS_ACTIVE,
                currentStatus: Task.CURRENT_STATUS_INACTIVE
            }));
            taskSuspendedToActive = await testHelpers.ensureTask(Object.assign(taskJson, {
                status: Task.STATUS_ACTIVE,
                currentStatus: Task.CURRENT_STATUS_SUSPENDED
            }));
            taskActiveToActive = await testHelpers.ensureTask(Object.assign(taskJson, {
                status: Task.STATUS_ACTIVE,
                currentStatus: Task.CURRENT_STATUS_ACTIVE
            }));
        });

        after(async () => {
            await Task.findByIdAndRemove(taskActive.id);
            await Task.findByIdAndRemove(taskInactive.id);
            await Task.findByIdAndRemove(taskDeleted.id);
            await Task.findByIdAndRemove(taskSuspended.id);
        });

        describe('non existent task id', () => {
            it('should return 404', () =>
                supertest(app)
                    .post('/hook/1234567890abcdef12345678')
                    .send({})
                    .expect(404)
                    .expect({
                        error: 'Task 1234567890abcdef12345678 either does not exist or is inactive.'
                    })
            );
        });

        describe('and some value in url after taskId', () => {
            describe('/', () => {
                it('should post successfully', () =>
                    supertest(app)
                        .post(`/hook/${taskActiveToActive.id}/`)
                        .send({})
                        .expect(200)
                        .expect(assertSuccessResponseBody)
                );
            });

            describe('/foo', () => {
                it('should post successfully', () =>
                    supertest(app)
                        .post(`/hook/${taskActiveToActive.id}/foo`)
                        .send({})
                        .expect(200)
                        .expect(assertSuccessResponseBody)
                );
            });

            describe('/foo/bar', () => {
                it('should post successfully', () =>
                    supertest(app)
                        .post(`/hook/${taskActiveToActive.id}/foo/bar`)
                        .send({})
                        .expect(200)
                        .expect(assertSuccessResponseBody)
                );
            })
        });

        describe('invalid task id', () => {
            //@todo it's better to return 400 here, but it requires to check that no compatibility issues
            it('should return 500', () =>
                supertest(app)
                    .post('/hook/1234')
                    .send({})
                    .expect(500)
                    .expect({})
            );
        });

        describe('inactive task', () => {
            it('should return 404', () =>
                supertest(app)
                    .post(`/hook/${taskInactive.id}`)
                    .send({})
                    .expect(404)
                    .expect({
                        error: `Task ${taskInactive.id} either does not exist or is inactive.`
                    })
            );

            describe('and should become active', () => {
                it('should return 404', () =>
                    supertest(app)
                        .post(`/hook/${taskInactiveToActive.id}`)
                        .send({})
                        .expect(404)
                        .expect({
                            error: `Task ${taskInactiveToActive.id} either does not exist or is inactive.`
                        })
                );
            });
        });

        describe('deleted task', () => {
            it('should return 404', () =>
                supertest(app)
                    .post(`/hook/${taskDeleted.id}`)
                    .send({})
                    .expect(404)
                    .expect({
                        error: `Task ${taskDeleted.id} either does not exist or is inactive.`
                    })
            );
        });

        describe('task STARTING', () => {
            it('should return 404', () =>
                supertest(app)
                    .post(`/hook/${taskStarting.id}`)
                    .send({})
                    .expect(404)
                    .expect({
                        error: `Task ${taskStarting.id} either does not exist or is inactive.`
                    })
            );
        });

        describe('task STOPPING', () => {
            it('should return 404', () =>
                supertest(app)
                    .post(`/hook/${taskStopping.id}`)
                    .send({})
                    .expect(404)
                    .expect({
                        error: `Task ${taskStopping.id} either does not exist or is inactive.`
                    })
            );
        });

        describe('application/json payload', () => {
            describe('and next state is active', () => {
                it('should post successfully', () =>
                    supertest(app)
                        .post(`/hook/${taskActiveToActive.id}`)
                        .send({})
                        .expect(200)
                        .expect(assertSuccessResponseBody)
                );
            });

            it('should post successfully', () =>
                supertest(app)
                    .post(`/hook/${taskActive.id}`)
                    .send({
                        msg: 'Lorem ipsum'
                    })
                    .expect(200)
                    .expect(assertSuccessResponseBody)
            );

            it('should find persisted RequestBin', () =>
                assertRequestBin(taskActive.id, 'POST',
                    'application/json', {
                        msg: 'Lorem ipsum'
                    })
            );
        });

        describe('suspended task', () => {
            describe('and next state is active', () => {
                it('should post successfully', () =>
                    supertest(app)
                        .post(`/hook/${taskSuspendedToActive.id}`)
                        .send({})
                        .expect(200)
                        .expect(assertSuccessResponseBody)
                );
            });

            it('should post successfully', () =>
                supertest(app)
                    .post(`/hook/${taskSuspended.id}`)
                    .send({
                        msg: 'Lorem ipsum'
                    })
                    .expect(200)
                    .expect(assertSuccessResponseBody)
            );

            it('should find persisted RequestBin', () =>
                assertRequestBin(taskSuspended.id, 'POST',
                    'application/json', {
                        msg: 'Lorem ipsum'
                    })
            );
        });

        describe('without specifying Content-Type', () => {
            it('should respond with 415', () =>
                supertest(app)
                    .post(`/hook/${taskActive.id}`)
                    .send(JSON.stringify({
                        msg: 'Lorem ipsum'
                    }))
                    .unset('Content-Type')
                    .expect(415)
                    .expect({
                        error: 'Content-Type header is missing'
                    })
            );
        });

        describe('text/plain payload', () => {
            it('should post successfully', () =>
                supertest(app)
                    .post(`/hook/${taskActive.id}`)
                    .set('Content-Type', 'text/plain')
                    .send(JSON.stringify({
                        msg: 'Lorem ipsum'
                    }))
                    .expect(200)
                    .expect(assertSuccessResponseBody)
            );

            it('should find persisted RequestBin', () =>
                assertRequestBin(taskActive.id, 'POST',
                    'text/plain', {
                        msg: 'Lorem ipsum'
                    })
            );
        });

        describe('text/csv payload', () => {
            it('should post successfully', () =>
                supertest(app)
                    .post(`/hook/${taskActive.id}`)
                    .set('Content-Type', 'text/csv')
                    .send('foo,bar,baz\nbaz,bar,foo')
                    .expect(200)
                    .expect(assertSuccessResponseBody)
            );

            it('should find persisted RequestBin', () =>
                assertRequestBin(taskActive.id, 'POST',
                    'text/csv',
                    'foo,bar,baz\nbaz,bar,foo')
            );
        });


        describe('application/xml payload', () => {
            it('should post successfully', () =>
                supertest(app)
                    .post(`/hook/${taskActive.id}`)
                    .set('Content-Type', 'application/xml')
                    .send(fs.readFileSync('./spec/data/po.xml', 'utf-8'))
                    .expect(200)
                    .expect(assertSuccessResponseBody)
            );

        });


        describe('invalid application/xml payload', () => {
            it('should receive 400 "Bad Request"', () =>
                supertest(app)
                    .post(`/hook/${taskActive.id}`)
                    .set('Content-Type', 'application/xml')
                    .send('<bar><hasi></bar>')
                    .expect(400)
            );
        });

        describe('application/x-www-form-urlencoded payload', () => {
            it('should post successfully', () =>
                supertest(app)
                    .post(`/hook/${taskActive.id}`)
                    .set('Content-Type', 'application/x-www-form-urlencoded')
                    .send('param1=hello&foo[bar][baz]=foobarbaz')
                    .expect(200)
                    .expect(assertSuccessResponseBody)
            );

            it('should find persisted RequestBin', () =>
                assertRequestBin(taskActive.id, 'POST',
                    'application/x-www-form-urlencoded',
                    'param1=hello&foo[bar][baz]=foobarbaz')
            );
        });

        describe('multipart/form-data with', () => {
            describe('values payload', () => {
                it('should post successfully', () =>
                    supertest(app)
                        .post(`/hook/${taskActive.id}`)
                        .field('foo', 'value')
                        .field('bar', 'value1')
                        .field('bar', 'value2')
                        .field('bar', 'value3')
                        .attach('attachment', 'spec/data/sample.jpg')
                        //TODO it would be nice to test attachments too
                        .expect(200)
                        .expect(assertSuccessResponseBody)
                );

                it('should find persisted RequestBin', () =>
                    assertRequestBin(taskActive.id, 'POST',
                        'multipart/form-data', {
                            foo: 'value',
                            bar: ['value1', 'value2', 'value3']
                        })
                );
            });

        });

        describe('GET with query params', () => {
            it('should get successfully', () =>
                supertest(app)
                    .get(`/hook/${taskActive.id}?msg=Hello world!`)
                    .expect(200)
                    .expect(assertSuccessResponseBody)
            );

            it('should find persisted RequestBin', () => getRequestBin()
                .then((bin) => {
                    assert(!!bin, 'RequestBin not found');
                    assert.equal(bin.taskId.toString(), taskActive.id);
                    assert.equal(bin.method, 'GET');
                    assert.deepEqual(bin.query, {
                        msg: 'Hello world!'
                    });
                    assert.equal(bin.url, `/hook/${taskActive.id}?msg=Hello%20world!`);
                }));
        });

        describe('verify task', () => {
            it('should verify successfully', (done) => {
                supertest(app)
                    .head(`/hook/${taskActive.id}`)
                    .expect(200, done);
            });
        });


        describe('header x-request-id', () => {
            describe('when requestId is valid (contains 32 heximals)', () => {
                it('should honor and use the provided value', async () => {
                    //@todo generate a new requestId because current test uses popeye-db and not clear it
                    const incomingRequestId = generateRequestId();
                    const message = {
                        t: 'hello world'
                    };
                    await supertest(app)
                        .post(`/hook/${taskActive.id}`)
                        .set('Content-Type', 'application/json')
                        .set('x-request-id', incomingRequestId)
                        .send(message)
                        .expect(200)
                        .expect(assertSuccessResponseBody);

                    const bin = await assertRequestBin(taskActive.id, 'POST', 'application/json', message);
                    assert.equal(bin.requestId, incomingRequestId);

                });
            });

            describe('when requestId is omitted', () => {
                it('should generate own requestId and process request', async () => {
                    const message = {
                        t: 'message with too long request id'
                    };
                    await supertest(app)
                        .post('/hook/' + taskActive.id)
                        .set('Content-Type', 'application/json')
                        .send(message)
                        .expect(200)
                        .expect(assertSuccessResponseBody);

                    const bin = await assertRequestBin(taskActive.id, 'POST', 'application/json', message);

                    assert.match(bin.requestId, /^[0-9a-f]{32}$/, 'generated requestId must contain 32 heximals');
                });
            });

            describe('when requestId has correct length, but contain invalid symbols', () => {
                it('should honor and use the provided value', async () => {
                    const incomingRequestId = '9625808fdb8c990c4e33c5d41caf22fm';
                    const message = {
                        t: 'hello world'
                    };
                    await supertest(app)
                        .post('/hook/' + taskActive.id)
                        .set('Content-Type', 'application/json')
                        .set('x-request-id', incomingRequestId)
                        .send(message)
                        .expect(200)
                        .expect(assertSuccessResponseBody);

                    const bin = await assertRequestBin(taskActive.id, 'POST', 'application/json', message);

                    assert.notEqual(bin.requestId, incomingRequestId);
                    assert.match(bin.requestId, /^[0-9a-f]{32}$/, 'generated requestId must contain 32 heximals');
                });
            });

            describe('when requestId is too short', () => {
                it('should ignore value from headers, generate own requestId and process request', async () => {

                    const incomingRequestId = 'aaa';
                    const message = {
                        t: 'too short request id'
                    };
                    await supertest(app)
                        .post('/hook/' + taskActive.id)
                        .set('Content-Type', 'application/json')
                        .set('x-request-id', incomingRequestId)
                        .send(message)
                        .expect(200)
                        .expect(assertSuccessResponseBody);

                    const bin = await assertRequestBin(taskActive.id, 'POST', 'application/json', message);

                    assert.notEqual(bin.requestId, incomingRequestId);
                    assert.match(bin.requestId, /^[0-9a-f]{32}$/, 'generated requestId must contain 32 heximals');
                });
            });

            describe('when requestId is too long', () => {
                it('should ignore value from headers, generate own requestId and process request', async () => {

                    const incomingRequestId = '12345678901234567890123456789012345678901234567890';
                    const message = {
                        t: 'message with too long request id'
                    };
                    await supertest(app)
                        .post('/hook/' + taskActive.id)
                        .set('Content-Type', 'application/json')
                        .set('x-request-id', incomingRequestId)
                        .send(message)
                        .expect(200)
                        .expect(assertSuccessResponseBody);

                    const bin = await assertRequestBin(taskActive.id, 'POST', 'application/json', message);

                    assert.notEqual(bin.requestId, incomingRequestId);
                    assert.match(bin.requestId, /^[0-9a-f]{32}$/, 'generated requestId must contain 32 heximals');
                });
            });
        });

    });

    describe('hmac verification', () => {
        describe('when key is specified in flow node config', () => {
            const hmacTaskJson = require('./webhook_task_hmac.json');
            let hmacTask;
            let hmacTaskId;

            before(async () => {
                hmacTask = await testHelpers.ensureTask(Object.assign(hmacTaskJson, {
                    orgId: org._id
                }), true);
                hmacTaskId = hmacTask._id;
            });

            after(async () => {
                await Task.findByIdAndRemove(hmacTaskId);
            });

            it('should refuse non signed request', () => {
                const body = JSON.stringify({
                    msg: 'Lorem ipsum'
                });

                return supertest(app)
                    .post('/hook/' + hmacTaskId)
                    .set('Content-Type', 'text/plain')
                    .send(body)
                    .expect(400);
            });

            it('should verify signature of POST body', () => {
                const body = JSON.stringify({
                    msg: 'Lorem ipsum'
                });
                const sharedSecret = 'abcd';
                const sig = crypto.createHmac('sha512', sharedSecret).update(body).digest('hex');

                return supertest(app)
                    .post('/hook/' + hmacTaskId)
                    .set('Content-Type', 'text/plain')
                    .set('X-EIO-Signature', sig)
                    .send(body)
                    .expect(200)
                    .expect(assertSuccessResponseBody);
            });

            //special thanks to ruby perverts for this case
            it('should verify signature of POST body with float number containing zero after dot in json', () => {
                const json = '{"float": 1.0}';
                const sharedSecret = 'abcd';
                const sig = crypto.createHmac('sha512', sharedSecret).update(json).digest('hex');

                return supertest(app)
                    .post('/hook/' + hmacTaskId)
                    .set('Content-Type', 'text/plain')
                    .set('X-EIO-Signature', sig)
                    .send(json)
                    .expect(200)
                    .expect(assertSuccessResponseBody);
            });

            it('should refuse request with incorrect signature', () => {
                const body = JSON.stringify({
                    msg: 'Lorem ipsum'
                });
                const sharedSecret = 'INCORRECT_KEY';
                const sig = crypto.createHmac('sha512', sharedSecret).update(body).digest('hex');

                return supertest(app)
                    .post('/hook/' + hmacTaskId)
                    .set('Content-Type', 'text/plain')
                    .set('X-EIO-Signature', sig)
                    .send(body)
                    .expect(400);
            });
        });

        describe('when key is specified in flow node creds', () => {
            const hmacTaskJson = require('./webhook_task_hmac.json');
            let hmacTask;
            let hmacTaskId;
            let hmacCred;

            before(async () => {
                hmacCred = await testHelpers.ensureAccount({
                    user: user._id,
                    orgId: org._id,
                    keys: {
                        auth: {
                            type: 'HMAC',
                            hmacSecret: hmacTaskJson.data.webhook_step.hmac_key
                        }
                    }
                });
                hmacTaskJson.data.webhook_step._account = hmacCred.id;
                delete hmacTaskJson.data.webhook_step.hmac_key;
                hmacTask = await testHelpers.ensureTask(Object.assign(hmacTaskJson, {
                    user: user._id,
                    orgId: org._id
                }), true);
                hmacTaskId = hmacTask._id;
            });

            after(async () => {
                await Task.findByIdAndRemove(hmacTaskId);
                await Account.findByIdAndRemove(hmacCred.id);
            });

            it('should refuse non signed request', () => {
                const body = JSON.stringify({
                    msg: 'Lorem ipsum'
                });

                return supertest(app)
                    .post('/hook/' + hmacTaskId)
                    .set('Content-Type', 'text/plain')
                    .send(body)
                    .expect(400);
            });

            it('should verify signature of POST body', () => {
                const body = JSON.stringify({
                    msg: 'Lorem ipsum'
                });
                const sharedSecret = 'abcd';
                const sig = crypto.createHmac('sha512', sharedSecret).update(body).digest('hex');

                return supertest(app)
                    .post('/hook/' + hmacTaskId)
                    .set('Content-Type', 'text/plain')
                    .set('X-EIO-Signature', sig)
                    .send(body)
                    .expect(200)
                    .expect(assertSuccessResponseBody);
            });

            //special thanks to ruby perverts for this case
            it('should verify signature of POST body with float number containing zero after dot in json', () => {
                const json = '{"float": 1.0}';
                const sharedSecret = 'abcd';
                const sig = crypto.createHmac('sha512', sharedSecret).update(json).digest('hex');

                return supertest(app)
                    .post('/hook/' + hmacTaskId)
                    .set('Content-Type', 'text/plain')
                    .set('X-EIO-Signature', sig)
                    .send(json)
                    .expect(200)
                    .expect(assertSuccessResponseBody);
            });

            it('should refuse request with incorrect signature', () => {
                const body = JSON.stringify({
                    msg: 'Lorem ipsum'
                });
                const sharedSecret = 'INCORRECT_KEY';
                const sig = crypto.createHmac('sha512', sharedSecret).update(body).digest('hex');

                return supertest(app)
                    .post('/hook/' + hmacTaskId)
                    .set('Content-Type', 'text/plain')
                    .set('X-EIO-Signature', sig)
                    .send(body)
                    .expect(400);
            });
        });
    });

    describe('basic auth', () => {
        const taskJson = require('./webhook_task.json');
        let basicAuthTask;
        let basicAuthTaskId;
        let basicAuthCred;
        const username = 'thor_odinson';
        const password = 'goldilocks';

        before(async () => {
            basicAuthCred = await testHelpers.ensureAccount({
                user: user._id,
                orgId: org._id,
                keys: {
                    auth: {
                        type: 'BASIC',
                        basic: {
                            username,
                            password
                        }
                    }
                }
            });
            taskJson.data.step_1._account = basicAuthCred.id;
            basicAuthTask = await testHelpers.ensureTask(Object.assign(taskJson, {
                user: user._id,
                orgId: org._id
            }), true);
            basicAuthTaskId = basicAuthTask._id;
        });

        after(async () => {
            await Task.findByIdAndRemove(basicAuthTaskId);
            await Account.findByIdAndRemove(basicAuthCred.id);
        });

        it('should refuse with no auth', () => supertest(app)
            .post('/hook/' + basicAuthTaskId)
            .set('Content-Type', 'application/json')
            .send({
                msg: 'Lorem ipsum'
            })
            .expect(401));

        it('should refuse with wrong creds', () => supertest(app)
            .post('/hook/' + basicAuthTaskId)
            .set('Content-Type', 'application/json')
            .auth('HULK', 'HULK_CRUSHES')
            .send({
                msg: 'Lorem ipsum'
            })
            .expect(401));


        it('should accept valid creds', () => supertest(app)
            .post('/hook/' + basicAuthTaskId)
            .set('Content-Type', 'application/json')
            .auth(username, password)
            .send({
                msg: 'Lorem ipsum'
            })
            .expect(200)
            .expect(assertSuccessResponseBody));
    });

    describe('API key auth', () => {
        const taskJson = require('./webhook_task.json');
        let apiKeyAuthTask;
        let apiKeyAuthTaskId;
        let apiKeyAuthCred;
        const headerName = 'X-My-API-Key';
        const headerValue = 'not_very_secure_key';

        before(async () => {
            apiKeyAuthCred = await testHelpers.ensureAccount({
                user: user._id,
                orgId: org._id,
                keys: {
                    auth: {
                        type: 'API_KEY',
                        apiKey: {
                            headerName,
                            headerValue
                        }
                    }
                }
            });
            taskJson.data.step_1._account = apiKeyAuthCred.id;
            apiKeyAuthTask = await testHelpers.ensureTask(Object.assign(taskJson, {
                user: user._id,
                orgId: org._id
            }), true);
            apiKeyAuthTaskId = apiKeyAuthTask._id;
        });

        after(async () => {
            await Task.findByIdAndRemove(apiKeyAuthTaskId);
            await Account.findByIdAndRemove(apiKeyAuthCred.id);
        });

        it('should refuse with no header', () => supertest(app)
            .post('/hook/' + apiKeyAuthTaskId)
            .set('Content-Type', 'application/json')
            .send({
                msg: 'Lorem ipsum'
            })
            .expect(401));

        it('should refuse with wrong key', () => supertest(app)
            .post('/hook/' + apiKeyAuthTaskId)
            .set('Content-Type', 'application/json')
            .set(headerName, 'another_not_really_secure_key')
            .send({
                msg: 'Lorem ipsum'
            })
            .expect(401));


        it('should accept valid key', () => supertest(app)
            .post('/hook/' + apiKeyAuthTaskId)
            .set('Content-Type', 'application/json')
            .set(headerName, headerValue)
            .send({
                msg: 'Lorem ipsum'
            })
            .expect(200)
            .expect(assertSuccessResponseBody));
    });

    describe('request-reply', () => {
        let task;
        let taskId;
        let publisherChannel;
        let subscriberChannel;
        let amqpConnection;
        let lastReplyToQueueName;

        async function setupFakeSailor(queueName, reply, headers) {
            const consumingOptions = {
                consumerTag: 'sailor'
            };

            function getReplyToQueueNameByRoutingKey(key) {
                const parts = key.split('_');
                const id = parts[parts.length - 1];
                return `request_reply_queue_${id}`;
            }

            function handler(reply) {
                return message => {
                    if (message.properties.headers.taskId !== task.id) {
                        return;
                    }

                    subscriberChannel.ack(message);
                    const replyTo = message.properties.headers.reply_to;
                    lastReplyToQueueName = getReplyToQueueNameByRoutingKey(replyTo);

                    const exchangeName = queues.getUserExchangeName(task);
                    const messageOpts = {
                        mandatory: true,
                        headers
                    };

                    publisherChannel.publish(exchangeName, replyTo, Buffer.from(JSON.stringify(reply)), messageOpts);
                    subscriberChannel.cancel(consumingOptions.consumerTag);
                };
            }
            await subscriberChannel.assertQueue(queueName, { exclusive: 1 })
            await subscriberChannel.consume(queueName, handler(reply), consumingOptions);
        }

        async function ensureQueueDoesntExist(queueName) {
            try {
                await rabbit.getVhostQueue(process.env.RABBITMQ_VIRTUAL_HOST, queueName);
            } catch (err) {
                if (err.statusCode === 404) {
                    return true;
                }
                console.log('some error happened', err);
                throw new Error('Failed to get queue:' + JSON.stringify(err.response.body));
            }
            throw new Error(`Queue "${queueName}" does exist`);
        }

        before(async () => {
            amqpConnection = await amqplib.connect(process.env.AMQP_URI);
        });

        beforeEach(async () => {
            const requestReplyTaskJson = require('./webhook_task_request_reply.json');
            task = await testHelpers.ensureTask(Object.assign(requestReplyTaskJson, {
                orgId: org._id
            }), true);
            taskId = task._id;

            publisherChannel = await amqpConnection.createChannel();
            subscriberChannel = await amqpConnection.createChannel();
            await publisherChannel.purgeQueue(env.getWebhooksScheduleRoutingKey());
        });

        afterEach(async () => {
            await ensureQueueDoesntExist(lastReplyToQueueName);
            lastReplyToQueueName = null;
            await Task.findByIdAndRemove(taskId);
            await publisherChannel.close();
            await subscriberChannel.close();
        });

        it('should reply successfully for missing stepsRoutingVersion', async () => {
            const reply = {
                headers: {},
                body: {
                    message: 'I am back'
                }
            };

            const queueName = amqp.getMessagesQueue(task, task.getFirstNode().id);
            await setupFakeSailor(queueName, reply);

            return supertest(app)
                .get(`/hook/${taskId}?msg=Lorem ipsum`)
                .expect(200)
                .expect(res => {
                    assert.equal(res.headers['x-powered-by'], 'elastic.io');
                    assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');

                    assert.deepEqual(res.body, {
                        message: 'I am back'
                    });
                });
        });

        it('should reply successfully for stepsRoutingVersion = 2', async () => {
            task.stepsRoutingVersion = 2;
            const reply = {
                headers: {},
                body: {
                    message: 'I am back'
                }
            };
            await task.save();
            const queueName = amqp.getMessagesQueue(task, task.getFirstNode().id);
            await setupFakeSailor(queueName, reply);
            return supertest(app)
                .get(`/hook/${taskId}?msg=Lorem ipsum`)
                .expect(200)
                .expect(res => {
                    assert.equal(res.headers['x-powered-by'], 'elastic.io');
                    assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');

                    assert.deepEqual(res.body, {
                        message: 'I am back'
                    });
                });
        });

        it('should reply XML successfully', async () => {
            const reply = {
                headers: {
                    'content-type': 'application/xml'
                },
                body: '<?xml version="1.0" encoding="UTF-8"?><S:Envelope></S:Envelope>'
            };

            const queueName = amqp.getMessagesQueue(task, task.getFirstNode().id);
            await setupFakeSailor(queueName, reply);

            return supertest(app)
                .get(`/hook/${taskId}?msg=Lorem ipsum`)
                .expect(200)
                .expect(res => {
                    assert.equal(res.headers['x-powered-by'], 'elastic.io');
                    assert.equal(res.headers['content-type'], 'application/xml; charset=utf-8');

                    assert.equal(res.text, '<?xml version="1.0" encoding="UTF-8"?><S:Envelope></S:Envelope>');
                });
        });

        it('should interpret AMQP header x-eio-error-response as error reply', async () => {
            const reply = {
                message: 'Ouch! Something went wrong',
                stack: 'Some stacktrace'
            };
            const headers = {
                'x-eio-error-response': true,
                'compId': 'mapper',
                'function': 'map',
                'stepId': 'step_3'
            };

            const queueName = amqp.getMessagesQueue(task, task.getFirstNode().id);
            await setupFakeSailor(queueName, reply, headers);

            return supertest(app)
                .get(`/hook/${taskId}?msg=Lorem ipsum`)
                .expect(200)
                .expect(res => {
                    assert.equal(res.headers['x-powered-by'], 'elastic.io');
                    assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');

                    assert.deepEqual(res.body, {
                        message: 'Component mapper failed when executing function map (step=step_3)',
                        error: {
                            message: 'Ouch! Something went wrong',
                            stack: 'Some stacktrace'
                        }
                    });
                });
        });

        it('should return error if first node is not found', async () => {
            const recipe = _.cloneDeep(task.recipe);
            recipe.connections = [];
            task.recipe = recipe;
            await task.save();

            const reply = {
                headers: {},
                body: {
                    message: 'I am back'
                }
            };
            const queueName = 'meaningless_value';
            await setupFakeSailor(queueName, reply);

            return supertest(app)
                .get(`/hook/${taskId}?msg=Lorem ipsum`)
                .expect(500, {
                    error: 'Could not find first step'
                });
        });
    });
});


function generateRequestId() {
    let res = '';
    for (let i = 0; i < 32; i++) {
        res += Math.floor(Math.random() * 16).toString(16);
    }
    return res;
}
