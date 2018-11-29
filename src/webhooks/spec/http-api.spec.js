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

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        flowsDao = new FlowsDao();
        flow = {
            id: 'test-id'
        };
        sandbox.stub(flowsDao, 'findById').resolves(flow);
        messagePublisher = new MessagePublisher();
        sandbox.stub(messagePublisher, 'publish').resolves();

        const httpApi = new HttpApi(createConfig(), flowsDao);
        httpApi.setHeadHandler((req, res) => new Head(req, res).handle());
        httpApi.setGetHandler((req, res) => new Get(req, res, messagePublisher).handle());
        httpApi.setPostHandler((req, res) => new Post(req, res, messagePublisher).handle());

        request = superagent(httpApi.getApp());
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
            const res = await request.get('/hook/123')
                .set('x-request-id', 'semen-semenich');

            expect(res.status).to.equal(200);
            expect(res.body).to.deep.equal({
                message: 'thank you',
                requestId: 'semen-semenich'
            });
            expect(messagePublisher.publish.calledOnce).to.be.true;
            //@todo: analize message
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
            const res = await request.post('/hook/123')
                .set('x-request-id', 'semen-semenich')
                .set('content-type', 'application/json')
                .send({
                    some: 'data'
                });

            expect(res.status).to.equal(200);
            expect(res.body).to.deep.equal({
                message: 'thank you',
                requestId: 'semen-semenich'
            });
            expect(messagePublisher.publish.called).to.be.true;
        });
    });
});
