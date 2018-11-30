const HttpApi = require('../src/http-api');
const superagent = require('supertest');
const FlowsDao = require('../src/flows-dao');
const MessagePublisher = require('../src/message-publishers/base');
const sinon = require('sinon');
const { Head, Post, Get } = require('../src/request-handlers');
const { expect } = require('chai');

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

        httpApi = new HttpApi(createConfig(), flowsDao);
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
            it('should respond', async () => {
                await request.head('/hook/123')
                    .expect({})
                    .expect(200);
            });
        });

        describe('GET /hook/:id', async () => {
            it('should respond', async () => {
                const res = await request.get('/hook/123?a=b')
                    .set('x-request-id', 'semen-semenich')
                    .set('x-custom-header', 'Hello');

                expect(res.status).to.equal(200);
                expect(res.body).to.deep.equal({
                    message: 'thank you',
                    requestId: 'semen-semenich'
                });

                expect(messagePublisher.publish.calledOnce).to.be.true;
                const [ flowArg, msgArg, optsArg ] = messagePublisher.publish.args[0];
                // flow
                expect(flowArg).to.deep.equal(flow);
                // msg
                expect(msgArg).to.be.a('object');
                expect(msgArg).to.to.have.all.keys([
                    'attachments',
                    'body',
                    'headers',
                    'id',
                    'metadata',
                    'method',
                    'originalUrl',
                    'params',
                    'pathSuffix',
                    'query',
                    'taskId',
                    'url'
                ]);
                expect(msgArg.taskId).to.equal('test-id');
                expect(msgArg.metadata).to.deep.equal({});
                expect(msgArg.method).to.equal('GET');
                expect(msgArg.originalUrl).to.equal('/hook/123?a=b');
                expect(msgArg.pathSuffix).to.equal('/hook/123');
                expect(msgArg.url).to.equal('/hook/123?a=b');
                expect(msgArg.params).to.deep.equal({});
                expect(msgArg.query).to.deep.equal({a: 'b'});
                expect(msgArg.body).to.deep.equal({
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
                expect(optsArg.headers).to.have.all.keys(['taskId', 'execId']);
                expect(optsArg.headers.taskId).to.equal(flow.id);
                expect(optsArg.headers.execId).to.be.a('string');
            });
        });

        describe('POST /hook/:id', async () => {
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
                    message: 'thank you',
                    requestId: 'semen-semenich'
                });

                expect(messagePublisher.publish.calledOnce).to.be.true;
                const [ flowArg, msgArg, optsArg ] = messagePublisher.publish.args[0];
                // flow
                expect(flowArg).to.deep.equal(flow);
                // msg
                expect(msgArg).to.be.a('object');
                expect(msgArg).to.to.have.all.keys([
                    'attachments',
                    'body',
                    'headers',
                    'id',
                    'metadata',
                    'method',
                    'originalUrl',
                    'params',
                    'pathSuffix',
                    'query',
                    'taskId',
                    'url'
                ]);
                expect(msgArg.taskId).to.equal('test-id');
                expect(msgArg.metadata).to.deep.equal({});
                expect(msgArg.method).to.equal('POST');
                expect(msgArg.originalUrl).to.equal('/hook/123?a=b');
                expect(msgArg.pathSuffix).to.equal('/hook/123');
                expect(msgArg.url).to.equal('/hook/123?a=b');
                expect(msgArg.params).to.deep.equal({});
                expect(msgArg.query).to.deep.equal({a: 'b'});
                expect(msgArg.body).to.deep.equal({
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
                expect(optsArg.headers).to.have.all.keys(['taskId', 'execId']);
                expect(optsArg.headers.taskId).to.equal(flow.id);
                expect(optsArg.headers.execId).to.be.a('string');
            });
        });
    });

    describe('with custom root handler', () => {
        beforeEach(() => {
            httpApi.setRootHandler((req, res) => res.send('custom response'));
        });

        describe('GET /', () => {
            it('should respond with custom response', async () => {
                await request.get('/')
                    .expect('custom response')
                    .expect(200);
            });
        });
    });

    describe('with custom healthcheck handler', () => {
        beforeEach(() => {
            httpApi.setHealthcheckHandler((req, res) => res.send('custom healthcheck'));
        });

        describe('GET /', () => {
            it('should respond with custom response', async () => {
                await request.get('/healthcheck')
                    .expect('custom healthcheck')
                    .expect(200);
            });
        });
    });
});
