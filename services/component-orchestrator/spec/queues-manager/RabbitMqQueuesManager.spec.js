const logger = require('bunyan').createLogger({ name: 'test' });
const sinon = require('sinon');
const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;

const RabbitMqQueuesManager = require('../../src/queues-manager/RabbitMqQueuesManager');
const RabbitMqManagementService = require('../../src/queues-manager/RabbitMqManagementService');

describe('RabbitMqQueuesManager', () => {
    let im;
    let config;
    let flowsDao;
    let driver;
    let queueCreator;
    let amqpChannel;

    function createConfig(conf = {}) {
        return {
            get: (key) => conf[key],
        };
    }

    beforeEach(() => {
        config = createConfig({
            RABBITMQ_URI_FLOWS: 'amqp://localhost',
            RABBITMQ_MANAGEMENT_URI: 'http://localhost',
        });

        queueCreator = {
            makeQueuesForTheFlow: () => {},
        };
        sinon.stub(queueCreator, 'makeQueuesForTheFlow').resolves();

        sinon.stub(RabbitMqManagementService.prototype, 'deleteUser').resolves();
        sinon.stub(RabbitMqManagementService.prototype, 'createFlowUser').resolves();
        sinon.stub(RabbitMqManagementService.prototype, 'getQueues').resolves([]);
        sinon.stub(RabbitMqManagementService.prototype, 'getExchanges').resolves([]);
        sinon.stub(RabbitMqManagementService.prototype, 'getBindings').resolves([]);

        amqpChannel = {
            deleteQueue: () => {},
            deleteExchange: () => {},
        };
        sinon.stub(amqpChannel, 'deleteQueue').resolves();
        sinon.stub(amqpChannel, 'deleteExchange').resolves();

        flowsDao = {
            findAll: () => {},
            ensureFinalizer: () => {},
            removeFinalizer: () => {},
        };
        sinon.stub(flowsDao, 'findAll').resolves();
        sinon.stub(flowsDao, 'ensureFinalizer').resolves();
        sinon.stub(flowsDao, 'removeFinalizer').resolves();

        driver = {
            getAppList: () => {},
            createApp: () => {},
            destroyApp: () => {},
        };
        sinon.stub(driver, 'getAppList').resolves();
        sinon.stub(driver, 'createApp').resolves();
        sinon.stub(driver, 'destroyApp').resolves();

        im = new RabbitMqQueuesManager({
            config,
            logger,
            queueCreator,
            driver,
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#deleteForFlow', () => {
        it('should delete infrastructure for the given flow', async () => {
            const flow = { id: 'flow1' };
            sinon.stub(im, '_deleteQueuesForFlow').resolves();
            sinon.stub(im, '_deleteRabbitMqCredentialsForFlow').resolves();

            await im.deleteForFlow(flow);

            expect(im._deleteQueuesForFlow).to.have.been.calledOnceWithExactly(flow);
            expect(im._deleteRabbitMqCredentialsForFlow).to.have.been.calledOnceWithExactly(flow);
        });
    });

    describe('#getSettingsForNodeExecution', () => {
        it('should return settings required for flow node execution', async () => {
            const component1 = { id: 'foo', isGlobal: false };
            const node1 = { id: 'step_1' };
            const flow = { id: 'flow1', nodes: [node1] };

            const componentsMap = new Map();

            componentsMap.set('step_1', component1);

            queueCreator.makeQueuesForTheFlow.resolves({
                step_1: {
                    SOME: 'stuff',
                },
            });

            sinon.stub(im, '_ensureRabbitMqCredentialsForFlowNode').resolves({
                username: 'kurt',
                password: 'cobain',
            });

            const flowSettings = await im.prepareQueues(flow, componentsMap);

            const settings = await im.getSettingsForNodeExecution(flow, node1, flowSettings);
            expect(settings).to.deep.equal({
                AMQP_URI: 'amqp://kurt:cobain@localhost',
                SOME: 'stuff',
            });
        });
    });

    describe('#_prepareAmqpUri', () => {
        it('should return amqp connection string', () => {
            const uri = im._prepareAmqpUri({ username: 'homer', password: 'simpson' });
            expect(uri).to.equal('amqp://homer:simpson@localhost');
        });
    });

    describe('#_ensureRabbitMqCredentialsForFlowNode', () => {
        it('should create and return credentials', async () => {
            const node1 = { id: 'step_1' };
            const flow = {
                id: 'flow1',
                nodes: [node1],
            };
            const result = await im._ensureRabbitMqCredentialsForFlowNode(flow, node1);
            expect(RabbitMqManagementService.prototype.createFlowUser).to.have.been.calledOnce;
            const arg = RabbitMqManagementService.prototype.createFlowUser.firstCall.args[0];
            expect(arg).to.be.a('object');
            expect(arg.flow).to.equal(flow);
            expect(arg.username).to.equal('flow-flow1-step1');
            expect(arg.password).to.be.a('string');
            expect(arg.password.length).to.equal(36);
            expect(result).to.deep.equal({ username: arg.username, password: arg.password });
        });

        it('should not create new credentials if there are already in the store', async () => {
            const node1 = { id: 'step_1' };
            const flow = {
                id: 'flow1',
                nodes: [node1],
            };
            await im._saveRabbitMqCredential(flow, node1, { username: 'bob' });
            const result = await im._ensureRabbitMqCredentialsForFlowNode(flow, node1);
            expect(result).to.deep.equal({ username: 'bob' });
            expect(RabbitMqManagementService.prototype.createFlowUser).not.to.have.been.called;
        });
    });

    describe('#_deleteRabbitMqCredentialsForFlow', () => {
        it('should call _deleteAmqpCredentials', async () => {
            const node1 = { id: 'step_1' };
            const node2 = { id: 'step_2' };
            const flow = {
                id: 'test',
                nodes: [node1, node2],
            };

            im._saveRabbitMqCredential(flow, node1, { username: 'cred1' });
            im._saveRabbitMqCredential(flow, node2, { username: 'cred2' });

            await im._deleteRabbitMqCredentialsForFlow(flow);

            expect(RabbitMqManagementService.prototype.deleteUser).to.have.been.calledTwice;
            expect(RabbitMqManagementService.prototype.deleteUser.firstCall.args[0]).to.deep.equal({
                username: 'cred1',
            });
            expect(RabbitMqManagementService.prototype.deleteUser.secondCall.args[0]).to.deep.equal({
                username: 'cred2',
            });

            //@todo: check that it has been removed from the store
        });
    });

    describe('#_getQueuesStructure', () => {
        it('should return queues structure', async () => {
            const queues = [{ name: 'flow1:step1' }];
            const exchanges = [{ name: 'flow1' }];
            const bindings = [{ destination: 'flow1:step2' }];

            RabbitMqManagementService.prototype.getQueues.resolves(queues);
            RabbitMqManagementService.prototype.getExchanges.resolves(exchanges);
            RabbitMqManagementService.prototype.getBindings.resolves(bindings);

            const qs = await im._getQueuesStructure();
            expect(qs).to.deep.equal({
                flow1: {
                    queues: ['flow1:step1'],
                    exchanges: ['flow1'],
                    bindings,
                },
            });
        });
    });

    describe('#_buildMQIndex', () => {
        it('should return queues index', () => {
            const queues = [
                {
                    name: 'flow1:step1',
                },
                {
                    name: 'flow1:step2',
                },
            ];
            const exchanges = [
                {
                    name: 'flow1',
                },
            ];
            const bindings = [
                {
                    destination: 'flow1:step2',
                },
            ];
            const result = im._buildMQIndex(queues, exchanges, bindings);

            expect(result).to.deep.equal({
                flow1: {
                    queues: ['flow1:step1', 'flow1:step2'],
                    exchanges: ['flow1'],
                    bindings,
                },
            });
        });
    });
});
