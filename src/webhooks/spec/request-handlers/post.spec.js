const Post = require('../../src/request-handlers/post');
const express = require('express');
const superagent = require('supertest');
const { expect } = require('chai');
const MessagePublisher = require('../../src/message-publishers/base');
const sinon = require('sinon');
const bodyParser = require('../../src/body-parser');

describe('Post Request Handler', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Unit tests', () => {
        describe('constructor', () => {
            it('should accept only MessagePublisher type', () => {
                const req = {
                    on() {}
                };
                const res = {
                    on() {}
                };
                expect(() => new Post(req, res, {})).to.throw(
                    'messagePublisher has to be an instance of MessagePublisher'
                );
            });
        });
    });

    describe('Superagent tests', () => {
        let app;
        let messagePublisher;
        let response;
        let flow;

        beforeEach(async () => {
            messagePublisher = new MessagePublisher();
            sandbox.stub(messagePublisher, 'publish').resolves();

            flow = {
                id: 'test-flow-id'
            };


            app = express();
            app = bodyParser(app);

            app.post('/', async (req, res, next) => {
                req.id = 'my-req-id';
                req.task = flow;
                try {
                    new Post(req, res, messagePublisher).handle();
                } catch (e) {
                    return next(e);
                }
            });

            response = await superagent(app)
                .post('/?a=b')
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
                requestId: 'my-req-id',
                message: 'thank you'
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
                expect(msg.taskId).to.equal('test-flow-id');
                expect(msg.metadata).to.deep.equal({});
                expect(msg.method).to.equal('POST');
                expect(msg.originalUrl).to.equal('/?a=b');
                expect(msg.pathSuffix).to.equal('/');
                expect(msg.url).to.equal('/?a=b');
                expect(msg.params).to.deep.equal({});
                expect(msg.query).to.deep.equal({a: 'b'});
                expect(msg.body).to.deep.equal({
                    data: {
                        some: 'payload'
                    }
                });
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
                expect(args[2].headers).to.have.all.keys(['execId', 'taskId']);
                expect(args[2].headers.execId.length).to.equal(32);
                expect(args[2].headers.taskId).to.equal('test-flow-id');
            });
        });
    });
});
