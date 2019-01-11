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

    describe('#_createFlowAmqpCredentials', () => {
        it('should create amqp credentials', async () => {
            const flow = {id: 'test'};
            sinon.stub(im, '_createAmqpCredentials').resolves();
            await im._createFlowAmqpCredentials(flow);
            expect(im._createAmqpCredentials).to.have.been.calledOnceWithExactly(flow);
        });
    });

    describe('#_createAmqpCredentials', () => {
        it('should create credentials', async () => {
            const flow = {id: 'test'};
            const result = await im._createAmqpCredentials(flow);
            expect(rabbitmqManagement.createFlowUser).to.have.been.calledOnce;
            const arg = rabbitmqManagement.createFlowUser.firstCall.args[0];
            expect(arg).to.be.a('object');
            expect(arg.flow).to.equal(flow);
            expect(arg.username).to.equal(flow.id);
            expect(arg.password).to.be.a('string');
            expect(arg.password.length).to.equal(36);
            expect(result).to.deep.equal({username: arg.username, password: arg.password});
        });
    });

    describe('#_deleteRabbitMqCredentialsForFlow', () => {
        it('should call _deleteAmqpCredentials', async () => {
            const flow = {id: 'test'};
            sinon.stub(im, '_deleteAmqpCredentials').resolves();
            await im._deleteRabbitMqCredentialsForFlow(flow);

            expect(im._deleteAmqpCredentials).to.have.been.calledOnceWithExactly({username: flow.id});
        });
    });

    describe('#_deleteAmqpCredentials', () => {
        it('should call deleteUser', async () => {
            const credentials = {};
            await im._deleteAmqpCredentials(credentials);
            expect(rabbitmqManagement.deleteUser).to.have.been.calledOnceWithExactly(credentials);
        });
    });
});
