const ResourceCoordinator = require('../src/ResourceCoordinator');
const logger = require('bunyan');

describe('ResourceCoordinator', () => {
    let rc;
    let config;
    let logger;
    let queueCreator;
    let rabbitmqManagement;
    let amqpConnection;
    let flowsDao;
    let driver;

    function createConfig(conf = {}) {
        return {
            get: key => conf[key]
        };
    }

    beforeEach(() => {
        config = createConfig();

        queueCreator = {
            makeQueuesForTheFlow: () => {}
        };

        rabbitmqManagement = {
            getQueues: () => {},
            getExchanges: () => {},
            getBindings: () => {},
            createFlowUser: () => {},
            deleteUser: () => {}
        };

        amqpConnection = {
            createChannel: () => {}
        };

        flowsDao = {
            findAll: () => {},
            ensureFinalizer: () => {},
            removeFinalizer: () => {}
        };

        driver = {
            getAppList: () => {},
            createApp: () => {},
            destroyApp: () => {}
        };

        rc = new ResourceCoordinator(config, logger, queueCreator, rabbitmqManagement, amqpConnection, flowsDao, driver);
    });

    describe('#', () => {

    });
});
