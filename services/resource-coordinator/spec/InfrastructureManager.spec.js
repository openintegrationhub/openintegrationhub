const logger = require('bunyan').createLogger({name: 'test'});
const sinon = require('sinon');
const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;

const InfrastructureManager = require('../src/InfrastructureManager');

describe('Infrastructure Manager', () => {
    let im;
    let config;
    let rabbitmqManagement;
    let flowsDao;
    let driver;
    let infrastructureManager;
    let queueCreator;
    let amqpChannel;
    let amqpConnection;

    function createConfig(conf = {}) {
        return {
            get: key => conf[key]
        };
    }

    beforeEach(() => {
        config = createConfig({
            RABBITMQ_URI_FLOWS: 'amqp://localhost'
        });

        queueCreator = {
            makeQueuesForTheFlow: () => {}
        };
        sinon.stub(queueCreator, 'makeQueuesForTheFlow').resolves();

        rabbitmqManagement = {
            getQueues: () => {},
            getExchanges: () => {},
            getBindings: () => {},
            createFlowUser: () => {},
            deleteUser: () => {}
        };
        sinon.stub(rabbitmqManagement, 'deleteUser').resolves();
        sinon.stub(rabbitmqManagement, 'createFlowUser').resolves();
        sinon.stub(rabbitmqManagement, 'getQueues').resolves([]);
        sinon.stub(rabbitmqManagement, 'getExchanges').resolves([]);
        sinon.stub(rabbitmqManagement, 'getBindings').resolves([]);

        amqpChannel = {
            deleteQueue: () => {},
            deleteExchange: () => {}
        };
        sinon.stub(amqpChannel, 'deleteQueue').resolves();
        sinon.stub(amqpChannel, 'deleteExchange').resolves();

        amqpConnection = {
            createChannel: () => Promise.resolve(amqpChannel)
        };

        flowsDao = {
            findAll: () => {},
            ensureFinalizer: () => {},
            removeFinalizer: () => {}
        };
        sinon.stub(flowsDao, 'findAll').resolves();
        sinon.stub(flowsDao, 'ensureFinalizer').resolves();
        sinon.stub(flowsDao, 'removeFinalizer').resolves();

        driver = {
            getAppList: () => {},
            createApp: () => {},
            destroyApp: () => {}
        };
        sinon.stub(driver, 'getAppList').resolves();
        sinon.stub(driver, 'createApp').resolves();
        sinon.stub(driver, 'destroyApp').resolves();

        infrastructureManager = {
            createForFlow: () => {},
            updateForFlow: () => {},
            deleteForFlow: () => {},
            getSettingsForNodeExecution: () => {}
        };
        sinon.stub(infrastructureManager, 'createForFlow').resolves();
        sinon.stub(infrastructureManager, 'updateForFlow').resolves();
        sinon.stub(infrastructureManager, 'deleteForFlow').resolves();
        sinon.stub(infrastructureManager, 'getSettingsForNodeExecution').resolves();

        im = new InfrastructureManager({
            config,
            logger,
            rabbitmqManagement,
            amqpConnection,
            queueCreator,
            driver
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#createForFlow', () => {
        it('should create needed infrastructure', async () => {
            const flow = {id: 'flow1'};
            await im.createForFlow(flow);
            expect(queueCreator.makeQueuesForTheFlow).to.have.been.calledOnceWithExactly(flow);
        });
    });

    describe('#updateForFlow', () => {
        it('should re-create needed infrastructure', async () => {
            const flow = {id: 'flow1'};
            const queuesStructure = {};
            sinon.stub(im, '_deleteQueuesForFlow').resolves();
            await im.updateForFlow(flow, {});
            expect(im._deleteQueuesForFlow).to.have.been.calledOnceWithExactly(flow, queuesStructure);
            expect(queueCreator.makeQueuesForTheFlow).to.have.been.calledOnceWithExactly(flow);
        });
    });

    describe('#deleteForFlow', () => {
        it('should delete infrastructure for the given flow', async () => {
            const flow = {id: 'flow1'};
            const queuesStructure = {};
            sinon.stub(im, '_deleteQueuesForFlow').resolves();
            sinon.stub(im, '_deleteRabbitMqCredentialsForFlow').resolves();

            await im.deleteForFlow(flow, queuesStructure);

            expect(im._deleteQueuesForFlow).to.have.been.calledOnceWithExactly(flow, queuesStructure);
            expect(im._deleteRabbitMqCredentialsForFlow).to.have.been.calledOnceWithExactly(flow);
        });
    });

    describe('#getSettingsForNodeExecution', () => {
        it('should return settings required for flow node execution', async () => {
            const node1 = {id: 'step_1'};
            const flow = {id: 'flow1', nodes: [node1]};

            queueCreator.makeQueuesForTheFlow.resolves({
                step_1: {
                    SOME: 'stuff'
                }
            });

            sinon.stub(im, '_ensureRabbitMqCredentialsForFlowNode').resolves({
                username: 'kurt',
                password: 'cobain'
            });

            const settings = await im.getSettingsForNodeExecution(flow, node1);
            expect(settings).to.deep.equal({
                AMQP_URI: 'amqp://kurt:cobain@localhost',
                SOME: 'stuff'
            });
        });
    });

    describe('#_deleteQueuesForFlow', () => {
        it('should delete queues and exchanges', async () => {
            const flow = {id: 'flow1'};
            const queuesStructure = {
                flow1: {
                    queues: ['flow1:step1'],
                    exchanges: ['flow1']
                }
            };
            await im._deleteQueuesForFlow(flow, queuesStructure);
        });
    });

    describe('#_prepareAmqpUri', () => {
        it('should return amqp connection string', () => {
            const uri = im._prepareAmqpUri({username: 'homer', password: 'simpson'});
            expect(uri).to.equal('amqp://homer:simpson@localhost');
        });
    });

    describe('#_ensureRabbitMqCredentialsForFlowNode', () => {
        it('should create and return credentials', async () => {
            const node1 = {id: 'step_1'};
            const flow = {
                id: 'flow1',
                nodes: [node1]
            };
            const result = await im._ensureRabbitMqCredentialsForFlowNode(flow, node1);
            expect(rabbitmqManagement.createFlowUser).to.have.been.calledOnce;
            const arg = rabbitmqManagement.createFlowUser.firstCall.args[0];
            expect(arg).to.be.a('object');
            expect(arg.flow).to.equal(flow);
            expect(arg.username).to.equal('flow1step1');
            expect(arg.password).to.be.a('string');
            expect(arg.password.length).to.equal(36);
            expect(result).to.deep.equal({username: arg.username, password: arg.password});
        });

        it('should not create new credentials if there are already in the store', async () => {
            const node1 = {id: 'step_1'};
            const flow = {
                id: 'flow1',
                nodes: [node1]
            };
            await im._saveRabbitMqCredentials(flow, node1, {username: 'bob'});
            const result = await im._ensureRabbitMqCredentialsForFlowNode(flow, node1);
            expect(result).to.deep.equal({username: 'bob'});
            expect(rabbitmqManagement.createFlowUser).not.to.have.been.called;
        });
    });

    describe('#_deleteRabbitMqCredentialsForFlow', () => {
        it('should call _deleteAmqpCredentials', async () => {
            const node1 = {id: 'step_1'};
            const node2 = {id: 'step_2'};
            const flow = {
                id: 'test',
                nodes: [node1, node2]
            };

            im._saveRabbitMqCredentials(flow, node1, {username: 'cred1'});
            im._saveRabbitMqCredentials(flow, node2, {username: 'cred2'});

            await im._deleteRabbitMqCredentialsForFlow(flow);

            expect(rabbitmqManagement.deleteUser).to.have.been.calledTwice;
            expect(rabbitmqManagement.deleteUser.firstCall.args[0]).to.deep.equal({username: 'cred1'});
            expect(rabbitmqManagement.deleteUser.secondCall.args[0]).to.deep.equal({username: 'cred2'});

            //@todo: check that it has been removed from the store
        });
    });
});
