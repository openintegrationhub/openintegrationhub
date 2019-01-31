const { QueueCreator, App } = require('backend-commons-lib');
const { ResourceCoordinator } = require('@openintegrationhub/resource-coordinator');
const KubernetesDriver = require('./drivers/kubernetes/KubernetesDriver');
const RabbitmqManagementService = require('./RabbitmqManagementService');
const HttpApi = require('./HttpApi');
const FlowsK8sDao = require('./dao/FlowsK8sDao');
const InfrastructureManager = require('./InfrastructureManager');
const { asValue, asClass } = require('awilix');

class ResourceCoordinatorApp extends App {
    async _run() {
        const container = this.getContainer();
        const config = container.resolve('config');
        const amqp = container.resolve('amqp');
        const k8s = container.resolve('k8s');
        await amqp.start();
        await k8s.start();

        const channel = await amqp.getConnection().createChannel();
        const queueCreator = new QueueCreator(channel);

        container.register({
            queueCreator: asValue(queueCreator),
            rabbitmqManagement: asClass(RabbitmqManagementService).singleton(),
            flowsDao: asClass(FlowsK8sDao),
            httpApi: asClass(HttpApi).singleton(),
            driver: asClass(KubernetesDriver),
            infrastructureManager: asClass(InfrastructureManager),
            resourceCoordinator: asClass(ResourceCoordinator)
        });

        const rabbitmqManagement = container.resolve('rabbitmqManagement');
        await rabbitmqManagement.start();

        const httpApi = container.resolve('httpApi');
        httpApi.listen(config.get('LISTEN_PORT'));

        const resourceCoordinator = container.resolve('resourceCoordinator');
        await resourceCoordinator.start();
    }

    static get NAME() {
        return 'resource-coordinator';
    }
}
module.exports = ResourceCoordinatorApp;
