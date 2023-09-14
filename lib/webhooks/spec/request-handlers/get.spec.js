const Get = require('../../src/request-handlers/get');
const express = require('express');
const superagent = require('supertest');
const { expect } = require('chai');
const MessagePublisher = require('../../src/message-publishers/base');
const sinon = require('sinon');
const bodyParser = require('../../src/body-parser');

describe('Get Request Handler', () => {
    let sandbox;
    let messagePublisher;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        messagePublisher = new MessagePublisher();
        sandbox.stub(messagePublisher, 'publish').resolves();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Unit tests', () => {
        let post;
        let req;
        let res;
        let flow;

        beforeEach(() => {
            flow = {
                id: 'test-id'
            };
            req = {
                id: 'request-id',
                flow,
                route: {
                    keys: []
                },
                path: `/hooks/${flow.id}/foo/bar/baz`,
                params: {
                    taskId: flow.id
                },
                url: `/hooks/${flow.id}/foo/bar/baz`,
                method: 'GET',
                headers: {
                    some: 'header'
                },
                originalUrl: `/hooks/${flow.id}/foo/bar/baz`,
                query: {
                    some: 'query'
                },
                param() {},
                on() {}
            };
            res = {
                on() {},
                status() {
                    return this;
                },
                set() {
                    return this;
                },
                send() {
                    return this;
                }
            };
            post = new Get(req, res, messagePublisher);
        });

        describe('constructor', () => {
            it('should accept only MessagePublisher type', () => {
                expect(() => new Get(req, res, {})).to.throw(
                    'messagePublisher has to be an instance of MessagePublisher'
                );
            });
        });

        describe('#authorize', () => {
            it('should resolve to true', async () => {
                expect(await post.authorize()).to.be.undefined;
            });
        });

        describe('#createMessageFromPayload', () => {
            it('should work', async () => {
                const msg = await post.createMessageFromPayload();
                expect(msg.id).to.be.a('string');
                delete msg.id;
                expect(msg).to.deep.equal({
                    attachments: {},
                    data: {
                        some: 'query'
                    },
                    headers: {
                        some: 'header'
                    },
                    metadata: {
                        source: {
                            name: 'webhooks',
                            type: 'webhook',
                            externalExecId: 'request-id'
                        }
                    },
                    method: 'GET',
                    originalUrl: '/hooks/test-id/foo/bar/baz',
                    params: {},
                    pathSuffix: '/hooks/test-id/foo/bar/baz',
                    query: {
                        some: 'query'
                    },
                    url: '/hooks/test-id/foo/bar/baz'
                });
            });
        });

        describe('#handle', () => {
            it('should call all methods', async () => {
                const msg = {};
                const opts = {};
                const result = {};
                sandbox.stub(post, 'authorize').resolves();
                sandbox.stub(post, 'createMessageFromPayload').resolves(msg);
                sandbox.stub(post, 'createMessageOptions').resolves(opts);
                sandbox.stub(post, 'sendMessageForExecution').resolves(result);
                sandbox.stub(post, 'sendResponse').resolves();

                await post.handle();

                expect(post.authorize.calledOnce).to.be.true;
                expect(post.createMessageFromPayload.calledOnce).to.be.true;
                expect(post.createMessageOptions.calledOnce).to.be.true;
                expect(post.sendMessageForExecution.calledOnce).to.be.true;
                expect(post.sendMessageForExecution.calledWithExactly(msg, opts)).to.be.true;
                expect(post.sendResponse.calledOnce).to.be.true;
            });
        });

        describe('#createMessageOptions', () => {
            it('should work', async () => {
                const opts = await post.createMessageOptions();
                expect(opts).to.be.a('object');
                expect(opts).to.have.all.keys(['headers']);
                expect(opts.headers).to.have.all.keys(['taskId', 'execId', 'userId']);
                expect(opts.headers.taskId).to.equal('test-id');
                expect(opts.headers.execId).to.be.a('string');
                expect(opts.headers.execId.length).to.equal(32);
                expect(opts.headers.userId).to.equal('DOES_NOT_MATTER');
            });
        });

        describe('#sendMessageForExecution', () => {
            it('should work', async () => {
                const msg = {};
                const opts = {};

                sandbox.stub(post, 'getResponse').resolves({status: 'ok'});
                const result = await post.sendMessageForExecution(msg, opts);
                expect(result).to.deep.equal({status: 'ok'});
                expect(messagePublisher.publish.calledOnce).to.be.true;
                expect(messagePublisher.publish.calledWithExactly(flow, msg, opts)).to.be.true;
            });
        });

        describe('#getResponse', () => {
            it('should work', async () => {
                const response = await post.getResponse();
                expect(response).to.deep.equal({
                    status: 200,
                    headers: {
                        'content-type': 'application/json'
                    },
                    body: {
                      data: {
                        requestId: 'request-id',
                        message: 'thank you'
                        }
                    }
                });
            });
        });

        describe('#sendResponse', () => {
            it('should work', async () => {
                sandbox.spy(res, 'status');
                sandbox.spy(res, 'set');
                sandbox.spy(res, 'send');

                const status = 400;
                const headers = {some: 'header'};
                const body = {some: 'data'};
                await post.sendResponse({status, headers, body});

                expect(res.status.calledOnce).to.be.true;
                expect(res.set.calledOnce).to.be.true;
                expect(res.send.calledOnce).to.be.true;

                expect(res.status.calledWithExactly(400)).to.be.true;
                expect(res.set.calledWithExactly(headers)).to.be.true;
                expect(res.send.calledWithExactly(body)).to.be.true;
            });
        });
    });

    describe('Superagent tests', () => {
        let app;
        let response;
        let flow;

        beforeEach(async () => {
            flow = {
                id: 'test-flow-id'
            };


            app = express();
            app = bodyParser(app);

            app.get('/', async (req, res, next) => {
                req.id = 'my-req-id';
                req.flow = flow;
                try {
                    new Get(req, res, messagePublisher).handle();
                } catch (e) {
                    return next(e);
                }
            });

            response = await superagent(app)
                .get('/?a=b')
                .set('X-Custom-Header', 'Hello')
                .send({
                    data: {
                        some: 'payload'
                    }
                });
        });

        it('should respond with status 200', () => {
            expect(response.status).to.eq(200);
        });

        it('should respond with headers', async () => {
            expect(response.headers['content-type']).to.deep.equal('application/json; charset=utf-8');
        });

        it('should respond with default body', async () => {
            expect(response.body).to.deep.equal({
              data: {
                requestId: 'my-req-id',
                message: 'thank you'
                }
            });
        });

        describe('should call message publisher', () => {
            it('should be called once with 3 args', () => {
                expect(messagePublisher.publish.calledOnce).to.be.ok;
                const args = messagePublisher.publish.args[0];
                expect(args.length).to.equal(3);
            });

            it('should be called with correct flow', () => {
                const args = messagePublisher.publish.args[0];
                expect(args[0]).to.deep.equal(flow);
            });

            it('should be called with correct message', () => {
                const [, msg] = messagePublisher.publish.args[0];
                expect(msg).to.be.a('object');
                expect(msg).to.to.have.all.keys([
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
                expect(msg.metadata).to.deep.equal({
                    source: {
                        name: 'webhooks',
                        type: 'webhook',
                        externalExecId: 'my-req-id'
                    }
                });
                expect(msg.method).to.equal('GET');
                expect(msg.originalUrl).to.equal('/?a=b');
                expect(msg.pathSuffix).to.equal('/');
                expect(msg.url).to.equal('/?a=b');
                expect(msg.params).to.deep.equal({});
                expect(msg.query).to.deep.equal({a: 'b'});
                expect(msg.data).to.deep.equal({a: 'b'});
                expect(msg.id).to.be.a('string');
                expect(msg.headers).to.have.all.keys([
                    'accept-encoding',
                    'connection',
                    'content-length',
                    'content-type',
                    'host',
                    'user-agent',
                    'x-custom-header'
                ]);
                expect(msg.headers['x-custom-header']).to.equal('Hello');
            });

            it('should be called with correct message options', () => {
                const args = messagePublisher.publish.args[0];
                expect(args[2]).to.be.a('object');
                expect(Object.keys(args[2])).to.deep.equal(['headers']);
                expect(args[2].headers).to.be.a('object');
                expect(args[2].headers).to.have.all.keys(['execId', 'taskId', 'userId']);
                expect(args[2].headers.execId.length).to.equal(32);
                expect(args[2].headers.taskId).to.equal('test-flow-id');
                expect(args[2].headers.userId).to.equal('DOES_NOT_MATTER');
            });
        });
    });
});
