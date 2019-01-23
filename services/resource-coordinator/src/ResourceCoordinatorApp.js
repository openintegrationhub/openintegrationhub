const Lib = require('backend-commons-lib');
const {
    QueueCreator,
    App,
    K8sService,
    AMQPService
} = Lib;

const { ResourceCoordinator } = require('@openintegrationhub/resource-coordinator');
const KubernetesDriver = require('./drivers/kubernetes/KubernetesDriver');
const RabbitmqManagementService = require('./RabbitmqManagementService');
const HttpApi = require('./HttpApi');
const FlowsK8sDao = require('./dao/FlowsK8sDao');
const InfrastructureManager = require('./InfrastructureManager');

class ResourceCoordinatorApp extends App {
    async _run() {
        const config = this.getConfig();
        const logger = this.getLogger();
        const amqp = new AMQPService(this);
        const rabbitmqManagement = new RabbitmqManagementService(config, logger);
        await rabbitmqManagement.start();
        const k8s = new K8sService(this);
        await amqp.start();
        await k8s.start();
        const flowsDao = new FlowsK8sDao(k8s);
        this._httpApi = new HttpApi(config, logger, flowsDao);
        this._httpApi.listen(config.get('LISTEN_PORT'));
        const channel = await amqp.getConnection().createChannel();
        const queueCreator = new QueueCreator(channel);

        const driver = new KubernetesDriver(config, logger, k8s);
        const infrastructureManager = new InfrastructureManager({
            config,
            logger,
            driver,
            rabbitmqManagement,
            amqpConnection: amqp.getConnection(),
            queueCreator
        });
        const resourceCoordinator = new ResourceCoordinator({
            config,
            logger,
            rabbitmqManagement,
            infrastructureManager,
            flowsDao,
            driver
        });
        await resourceCoordinator.start();
    }

    static get NAME() {
        return 'resource-coordinator';
    }
}
module.exports = ResourceCoordinatorApp;
