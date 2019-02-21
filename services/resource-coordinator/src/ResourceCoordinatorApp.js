const { QueueCreator, App } = require('backend-commons-lib');
const { ResourceCoordinator } = require('@openintegrationhub/resource-coordinator');
const KubernetesDriver = require('./drivers/kubernetes/KubernetesDriver');
const RabbitmqManagementService = require('./RabbitmqManagementService');
const HttpApi = require('./HttpApi');
const FlowsDao = require('./dao/FlowsDao');
const InfrastructureManager = require('./InfrastructureManager');
const { asValue, asClass, asFunction } = require('awilix');
const mongoose = require('mongoose');
const { EventBus, RabbitMqTransport } = require('@openintegrationhub/event-bus');

class ResourceCoordinatorApp extends App {
    async _run() {
        const container = this.getContainer();
        const config = container.resolve('config');
        const amqp = container.resolve('amqp');
        await amqp.start();

        const channel = await amqp.getConnection().createChannel();
        const queueCreator = new QueueCreator(channel);

        await mongoose.connect(config.get('MONGODB_URI'), {useNewUrlParser: true});

        container.register({
            queueCreator: asValue(queueCreator),
            rabbitmqManagement: asClass(RabbitmqManagementService).singleton(),
            flowsDao: asClass(FlowsDao),
            httpApi: asClass(HttpApi).singleton(),
            driver: asClass(KubernetesDriver),
            infrastructureManager: asClass(InfrastructureManager),
            transport: asClass(RabbitMqTransport, {
                injector: () => ({rabbitmqUri: config.get('RABBITMQ_URI')})
            }),
            eventBus: asClass(EventBus, {
                injector: () => ({serviceName: this.constructor.NAME})
            }).singleton(),
            resourceCoordinator: asClass(ResourceCoordinator)
        });

        container.loadModules(['./src/event-handlers/**/*.js'], {
            formatName: 'camelCase',
            resolverOptions: {
                register: asFunction
            }
        });

        const rabbitmqManagement = container.resolve('rabbitmqManagement');
        await rabbitmqManagement.start();

        const httpApi = container.resolve('httpApi');
        httpApi.listen(config.get('LISTEN_PORT'));

        await container.resolve('eventHandlers').connect();
        const resourceCoordinator = container.resolve('resourceCoordinator');
        await resourceCoordinator.start();
    }

    static get NAME() {
        return 'resource-coordinator';
    }
}
module.exports = ResourceCoordinatorApp;
