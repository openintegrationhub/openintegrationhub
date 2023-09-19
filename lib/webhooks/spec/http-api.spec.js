const HttpApi = require('../src/http-api');
const superagent = require('supertest');
const FlowsDao = require('../src/flows-dao');
const MessagePublisher = require('../src/message-publishers/base');
const sinon = require('sinon');
const { Head, Post, Get } = require('../src/request-handlers');
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

describe('HttpApi', () => {
    function createConfig(conf = {}) {
        return {
            get: key => conf[key]
        };
    }

    let messagePublisher;
    let flowsDao;
    let sandbox;
    let flow;
    let request;
    let httpApi;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        flowsDao = new FlowsDao();
        flow = {
            id: 'test-id'
        };
        sandbox.stub(flowsDao, 'findById').resolves(flow);
        messagePublisher = new MessagePublisher();
        sandbox.stub(messagePublisher, 'publish').resolves();

        httpApi = new HttpApi({config: createConfig(), flowsDao});
        request = superagent(httpApi.getApp());
    });

    describe('with default handlers', () => {
        beforeEach(() => {
            httpApi.setHeadHandler((req, res) => new Head(req, res).handle());
            httpApi.setGetHandler((req, res) => new Get(req, res, messagePublisher).handle());
            httpApi.setPostHandler((req, res) => new Post(req, res, messagePublisher).handle());
        });

        describe('GET /', () => {
            it('should respond', async () => {
                await request.get('/')
                    .expect('OK')
                    .expect(200);
            });
        });

        describe('GET /healthcheck', () => {
            it('should respond', async () => {
                await request.get('/healthcheck')
                    .expect('OK')
                    .expect(200);
            });
        });

        describe('HEAD /hook/:id', async () => {
            it('should respond 404', async () => {
                flowsDao.findById.resolves(null);
                await request.get('/hook/123?a=b')
                    .expect({
                        error: 'Flow 123 either does not exist or is inactive.'
                    })
                    .expect(404);
            });

            it('should respond', async () => {
                await request.head('/hook/123')
                    .expect({})
                    .expect(200);
            });
        });

        describe('GET /hook/:id', async () => {
            it('should respond 404', async () => {
                flowsDao.findById.resolves(null);
                await request.get('/hook/123?a=b')
                    .expect({
                        error: 'Flow 123 either does not exist or is inactive.'
                    })
                    .expect(404);
            });

            it('should respond', async () => {
                const res = await request.get('/hook/123?a=b')
                    .set('x-request-id', 'semen-semenich')
                    .set('x-custom-header', 'Hello');

                expect(res.status).to.equal(200);
                expect(res.body).to.deep.equal({
                  data: {
                    message: 'thank you',
                    requestId: 'semen-semenich'
                    }
                });

                expect(messagePublisher.publish.calledOnce).to.be.true;
                const [ flowArg, msgArg, optsArg ] = messagePublisher.publish.args[0];
                // flow
                expect(flowArg).to.deep.equal(flow);
                // msg
                expect(msgArg).to.be.a('object');
                expect(msgArg).to.to.have.all.keys([
                    'attachments',
                    'data',
                    'headers',
                    'id',
                    'metadata',
                    'method',
                    'originalUrl',
                    'params',
                    'pathSuffix',
                    'query',
                    'url'
                ]);
                expect(msgArg.metadata).to.deep.equal({
                    source: {
                        name: 'webhooks',
                        type: 'webhook',
                        externalExecId: 'semen-semenich'
                    }
                });
                expect(msgArg.method).to.equal('GET');
                expect(msgArg.originalUrl).to.equal('/hook/123?a=b');
                expect(msgArg.pathSuffix).to.equal('/hook/123');
                expect(msgArg.url).to.equal('/hook/123?a=b');
                expect(msgArg.params).to.deep.equal({});
                expect(msgArg.query).to.deep.equal({a: 'b'});
                expect(msgArg.data).to.deep.equal({
                    a: 'b'
                });
                expect(msgArg.id).to.be.a('string');
                expect(msgArg.headers).to.have.all.keys([
                    'accept-encoding',
                    'connection',
                    'host',
                    'user-agent',
                    'x-custom-header',
                    'x-request-id'
                ]);
                expect(msgArg.headers['x-custom-header']).to.equal('Hello');

                // msg options
                expect(optsArg).to.be.a('object');
                expect(optsArg).to.have.all.keys(['headers']);
                expect(optsArg.headers).to.be.a('object');
                expect(optsArg.headers).to.have.all.keys(['taskId', 'execId', 'userId']);
                expect(optsArg.headers.taskId).to.equal(flow.id);
                expect(optsArg.headers.execId).to.be.a('string');
                expect(optsArg.headers.userId).to.equal('DOES_NOT_MATTER');
            });
        });

        describe('POST /hook/:id', async () => {
            function assertSuccessResponseBody (res) {
                expect(res.body.data.message).to.equal('thank you');
                expect(res.body.data.requestId).to.be.a('string');
            }

            it('should respond 404', async () => {
                flowsDao.findById.resolves(null);
                await request.get('/hook/123?a=b')
                    .expect({
                        error: 'Flow 123 either does not exist or is inactive.'
                    })
                    .expect(404);
            });

            it('should respond with error if no content type header', async () => {
                const res = await request.post('/hook/123')
                    .set('x-request-id', 'semen-semenich');

                expect(res.status).to.equal(415);
                expect(res.body).to.deep.equal({
                    error: 'Content-Type header is missing'
                });
                expect(messagePublisher.publish.called).to.be.false;
            });

            it('should respond', async () => {
                const res = await request.post('/hook/123?a=b')
                    .set('x-request-id', 'semen-semenich')
                    .set('content-type', 'application/json')
                    .set('x-custom-header', 'Hello')
                    .send({
                        some: 'data'
                    });

                expect(res.status).to.equal(200);
                expect(res.body).to.deep.equal({
                  data:{
                    message: 'thank you',
                    requestId: 'semen-semenich'
                    }
                });

                expect(messagePublisher.publish.calledOnce).to.be.true;
                const [ flowArg, msgArg, optsArg ] = messagePublisher.publish.args[0];
                // flow
                expect(flowArg).to.deep.equal(flow);
                // msg
                expect(msgArg).to.be.a('object');
                expect(msgArg).to.to.have.all.keys([
                    'attachments',
                    'data',
                    'headers',
                    'id',
                    'metadata',
                    'method',
                    'originalUrl',
                    'params',
                    'pathSuffix',
                    'query',
                    'url'
                ]);
                expect(msgArg.metadata).to.deep.equal({
                    source: {
                        name: 'webhooks',
                        type: 'webhook',
                        externalExecId: 'semen-semenich'
                    }
                });
                expect(msgArg.method).to.equal('POST');
                expect(msgArg.originalUrl).to.equal('/hook/123?a=b');
                expect(msgArg.pathSuffix).to.equal('/hook/123');
                expect(msgArg.url).to.equal('/hook/123?a=b');
                expect(msgArg.params).to.deep.equal({});
                expect(msgArg.query).to.deep.equal({a: 'b'});
                expect(msgArg.data).to.deep.equal({
                    some: 'data'
                });
                expect(msgArg.id).to.be.a('string');
                expect(msgArg.headers).to.have.all.keys([
                    'accept-encoding',
                    'connection',
                    'content-length',
                    'content-type',
                    'host',
                    'user-agent',
                    'x-custom-header',
                    'x-request-id'
                ]);
                expect(msgArg.headers['x-custom-header']).to.equal('Hello');

                // msg options
                expect(optsArg).to.be.a('object');
                expect(optsArg).to.have.all.keys(['headers']);
                expect(optsArg.headers).to.be.a('object');
                expect(optsArg.headers).to.have.all.keys(['taskId', 'execId', 'userId']);
                expect(optsArg.headers.taskId).to.equal(flow.id);
                expect(optsArg.headers.execId).to.be.a('string');
                expect(optsArg.headers.userId).to.equal('DOES_NOT_MATTER');
            });

            describe('without specifying Content-Type', () => {
                it('should respond with 415', () =>
                    request
                        .post(`/hook/123`)
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
                    request
                        .post(`/hook/123`)
                        .set('Content-Type', 'text/plain')
                        .send(JSON.stringify({
                            msg: 'Lorem ipsum'
                        }))
                        .expect(200)
                        .expect(assertSuccessResponseBody)
                );
            });

            describe('text/csv payload', () => {
                it('should post successfully', () =>
                    request
                        .post(`/hook/123`)
                        .set('Content-Type', 'text/csv')
                        .send('foo,bar,baz\nbaz,bar,foo')
                        .expect(200)
                        .expect(assertSuccessResponseBody)
                );
            });

            describe('application/xml payload', () => {
                it('should post successfully', () =>
                    request
                        .post(`/hook/123`)
                        .set('Content-Type', 'application/xml')
                        .send(fs.readFileSync(path.join(__dirname, '/data/po.xml'), 'utf-8'))
                        .expect(200)
                        .expect(assertSuccessResponseBody)
                );
            });

            describe('invalid application/xml payload', () => {
                it('should receive 400 "Bad Request"', () =>
                    request
                        .post(`/hook/123`)
                        .set('Content-Type', 'application/xml')
                        .send('<bar><hasi></bar>')
                        .expect({
                            error: 'Unexpected close tag\nLine: 0\nColumn: 17\nChar: >'
                        })
                        .expect(400)
                );
            });

            describe('application/x-www-form-urlencoded payload', () => {
                it('should post successfully', () =>
                    request
                        .post(`/hook/123`)
                        .set('Content-Type', 'application/x-www-form-urlencoded')
                        .send('param1=hello&foo[bar][baz]=foobarbaz')
                        .expect(200)
                        .expect(assertSuccessResponseBody)
                );
            });

            describe('multipart/form-data with', () => {
                describe('values payload', () => {
                    it('should post successfully', () =>
                        request
                            .post(`/hook/123`)
                            .field('foo', 'value')
                            .field('bar', 'value1')
                            .field('bar', 'value2')
                            .field('bar', 'value3')
                            .attach('attachment', path.join(__dirname, '/data/sample.jpg'))
                            // TODO it would be nice to test attachments too
                            .expect(200)
                            .expect(assertSuccessResponseBody)
                    );
                });
            });
        });
    });

    describe('with custom handlers', () => {
        describe('GET /', () => {
            it('should respond with custom response', async () => {
                httpApi.setRootHandler((req, res) => res.send('custom response'));

                await request.get('/')
                    .expect('custom response')
                    .expect(200);
            });
        });

        describe('GET /healthcheck', () => {
            it('should respond with custom response', async () => {
                httpApi.setHealthcheckHandler((req, res) => res.send('custom healthcheck'));

                await request.get('/healthcheck')
                    .expect('custom healthcheck')
                    .expect(200);
            });
        });

        describe('GET /hook/:id', () => {
            it('should respond with custom response', async () => {
                httpApi.setPreHandler((req, res) => res.send('custom response'));

                await request.get('/hook/123')
                    .expect('custom response')
                    .expect(200);
            });
        });
    });
});
