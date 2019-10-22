const supertest = require('supertest');
const HttpApi = require('../src/HttpApi');
const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;
const logger = require('bunyan').createLogger({name: 'test'});
const sinon = require('sinon');
const Flow = require('../src/models/Flow');

describe('HttpApi', () => {
    let request;
    const flowsDao = {
        findById() {}
    };
    const secretsDao = {
        findById() {}
    };

    beforeEach(() => {
        const config = {
            get(key) {
                return this[key];
            }
        };

        const httpApi = new HttpApi({
            config,
            logger,
            flowsDao,
            secretsDao
        });
        request = supertest(httpApi.getApp());
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('GET /healthcheck', async () => {
        it('should return status 200', async () => {
            const { statusCode } = await request.get('/healthcheck');
            expect(statusCode).to.equal(200);
        });
    });

    describe('GET /v1/tasks/:flowId/steps/:stepId', async () => {
        it('should return step configuration without credentials', async () => {
            const flow = new Flow({
                graph: {
                    nodes: [{
                        id: 'step_1',
                        function: 'testFunction',
                        fields: {
                            field1: 'field1'
                        }
                    }]
                }
            });
            sinon.stub(flowsDao, 'findById').resolves(flow);
            sinon.stub(secretsDao, 'findById').resolves({});

            const { body, statusCode } = await request
                .get(`/v1/tasks/${flow.id}/steps/step_1`)
                .auth('iamtoken', 'token-value');

            expect(body).to.deep.equal({
                id: 'step_1',
                config: {
                    field1: 'field1',
                },
                function: 'testFunction',
            });
            expect(statusCode).to.equal(200);

            expect(flowsDao.findById).to.have.been.calledOnceWith(flow.id);
            expect(secretsDao.findById).not.to.have.been.called;
        });

        it('should return step configuration with credentials', async () => {
            const flow = new Flow({
                graph: {
                    nodes: [{
                        id: 'step_1',
                        function: 'testFunction',
                        credentials_id: 'cred123',
                        fields: {
                            field1: 'field1'
                        }
                    }]
                }
            });
            sinon.stub(flowsDao, 'findById').resolves(flow);
            sinon.stub(secretsDao, 'findById').resolves({
                value: {
                    username: 'john_travolta',
                    password: 'ohhai'
                }
            });

            const { body, statusCode } = await request
                .get(`/v1/tasks/${flow.id}/steps/step_1`)
                .auth('iamtoken', 'token-value');

            expect(body).to.deep.equal({
                id: 'step_1',
                config: {
                    field1: 'field1',
                    username: 'john_travolta',
                    password: 'ohhai'
                },
                function: 'testFunction',
            });
            expect(statusCode).to.equal(200);

            expect(flowsDao.findById).to.have.been.calledOnceWith(flow.id);
            expect(secretsDao.findById).to.have.been.calledOnceWith('cred123', {
                auth: {
                    token: 'token-value'
                }
            });
        });

        it('should return error if flow is not found', async () => {
            const flow = new Flow({
                graph: {
                    nodes: [{
                        id: 'step_1',
                        function: 'testFunction',
                        credentials_id: 'cred123',
                        fields: {
                            field1: 'field1'
                        }
                    }]
                }
            });
            sinon.stub(flowsDao, 'findById').resolves(null);
            sinon.stub(secretsDao, 'findById').resolves(null);

            const { body, statusCode } = await request
                .get(`/v1/tasks/${flow.id}/steps/step_1`)
                .auth('iamtoken', 'token-value');

            expect(body).to.deep.equal({
                error: 'Flow is not found'
            });
            expect(statusCode).to.equal(404);

            expect(flowsDao.findById).to.have.been.calledOnceWith(flow.id);
            expect(secretsDao.findById).not.to.have.been.called;
        });

        it('should return step configuration with credentials', async () => {
            const flow = new Flow({
                graph: {
                    nodes: [{
                        id: 'step_1',
                        function: 'testFunction',
                        credentials_id: 'cred123',
                        fields: {
                            field1: 'field1'
                        }
                    }]
                }
            });
            sinon.stub(flowsDao, 'findById').resolves(flow);
            sinon.stub(secretsDao, 'findById').resolves(null);

            const { body, statusCode } = await request
                .get(`/v1/tasks/${flow.id}/steps/step_1`)
                .auth('iamtoken', 'token-value');

            expect(body).to.deep.equal({
                error: 'Secret cred123 is not found'
            });
            expect(statusCode).to.equal(404);

            expect(flowsDao.findById).to.have.been.calledOnceWith(flow.id);
            expect(secretsDao.findById).to.have.been.calledOnceWith('cred123', {
                auth: {
                    token: 'token-value'
                }
            });
        });
    });
});
