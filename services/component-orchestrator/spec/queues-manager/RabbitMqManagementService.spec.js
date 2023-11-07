const RabbitMqManagementService = require('../../src/queues-manager/RabbitMqManagementService');
const chai = require('chai');
const { expect } = chai;
chai.use(require('sinon-chai'));
const sinon = require('sinon');

describe('RabbitMqManagementService', () => {
    let service;

    beforeEach(() => {
        const logger = {
            child() {
                return {
                    info: () => {},
                    debug: () => {},
                    trace: () => {},
                    warn: () => {},
                    error: () => {},
                };
            },
        };

        const config = {
            RABBITMQ_MANAGEMENT_URI: 'http://localhost/',
            get(key) {
                return this[key];
            },
        };
        service = new RabbitMqManagementService({ logger, config });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#getQueues', () => {
        it('should call getVhostQueues', async () => {
            sinon.stub(service._client, 'getVhostQueues').resolves([{ some: 'data' }]);
            const result = await service.getQueues();
            expect(result).to.deep.equal([{ some: 'data' }]);
            expect(service._client.getVhostQueues).to.have.been.calledOnceWith('/');
        });
    });

    describe('#getExchanges', () => {
        it('should call getVhostExchanges', async () => {
            sinon.stub(service._client, 'getVhostExchanges').resolves([{ some: 'data' }]);
            const result = await service.getExchanges();
            expect(result).to.deep.equal([{ some: 'data' }]);
            expect(service._client.getVhostExchanges).to.have.been.calledOnceWith('/');
        });
    });

    describe('#getBindings', () => {
        it('should call getVhostExchanges', async () => {
            sinon.stub(service._client, 'getVhostBindings').resolves([{ some: 'data' }]);
            const result = await service.getBindings();
            expect(result).to.deep.equal([{ some: 'data' }]);
            expect(service._client.getVhostBindings).to.have.been.calledOnceWith('/');
        });
    });

    describe('#createFlowUser', () => {
        it('should create', async () => {
            sinon.stub(service._client, 'putUser').resolves();
            sinon.stub(service._client, 'setUserPermissions').resolves();
            const params = {
                username: 'user1',
                password: 'pass1',
                flow: {
                    id: 'flow1',
                },
                backchannel: 'fooo',
            };
            await service.createFlowUser(params);
            expect(service._client.putUser).to.have.been.calledOnceWith(params.username, {
                password: params.password,
                tags: 'flow-user',
            });
            expect(service._client.setUserPermissions).to.have.been.calledOnceWith(params.username, '/', {
                configure: '',
                read: `^flow-${params.flow.id}:`,
                write: `^(${params.backchannel}|flow-${params.flow.id}|component-events-collector|event-bus)$`,
            });
        });
    });

    describe('#deleteUser', () => {
        it('should call deleteUser', async () => {
            sinon.stub(service._client, 'deleteUser').resolves();
            await service.deleteUser({ username: 'test-user' });
            expect(service._client.deleteUser).to.have.been.calledOnceWith('test-user');
        });

        it('should not throw if client returns Not Found', async () => {
            const err = new Error('Not found');
            err.statusCode = 404;
            sinon.stub(service._client, 'deleteUser').rejects(err);
            await service.deleteUser({ username: 'test-user' });
            expect(service._client.deleteUser).to.have.been.calledOnceWith('test-user');
        });

        it('should throw if client throws error with other status codes', async () => {
            const err = new Error('Internal server error');
            err.statusCode = 500;
            sinon.stub(service._client, 'deleteUser').rejects(err);
            try {
                await service.deleteUser({ username: 'test-user' });
                throw new Error('Should not reach this line');
            } catch (e) {
                expect(e.statusCode).to.equal(500);
                expect(e.message).to.equal('Failed to delete RabbitMQ user: Internal server error');
                expect(service._client.deleteUser).to.have.been.calledOnceWith('test-user');
            }
        });
    });
});
