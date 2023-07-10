const { QueueCreator, QueuePubSub, App } = require('backend-commons-lib');
const { ComponentOrchestrator } = require('@openintegrationhub/component-orchestrator');
const KubernetesDriver = require('./drivers/kubernetes/KubernetesDriver');
const HttpApi = require('./HttpApi');
const FlowsDao = require('./dao/FlowsDao');
const FlowStateDao = require('./dao/FlowStateDao')
const ComponentsDao = require('./dao/ComponentsDao');
const TokensDao = require('./dao/TokensDao');
const SecretsDao = require('./dao/SecretsDao');
const SnapshotsDao = require('./dao/SnapshotsDao');
const RabbitMqQueuesManager = require('./queues-manager/RabbitMqQueuesManager');
const iamUtils = require('@openintegrationhub/iam-utils');

const mongoose = require('mongoose');
const { EventBus } = require('@openintegrationhub/event-bus');
const MongoDbCredentialsStorage = require('./queues-manager/credentials-storage/MongoDbCredentialsStorage');

class ComponentOrchestratorApp extends App {
    async _run() {
        const { asValue, asClass, asFunction } = this.awilix;
        const container = this.getContainer();
        const config = container.resolve('config');
        const amqp = container.resolve('amqp');
        const k8s = container.resolve('k8s');
        const logger = container.resolve('logger');
        await amqp.start();

        await k8s.start(config.get('KUBE_CONFIG'));

        const channel = await amqp.getConnection().createChannel();

        channel.on('error', function(err) {
          logger.fatal(err, 'RabbitMQ channel error');
          process.exit(1);
        });

        channel.on('close', function() {
            logger.fatal('RabbitMQ channel closed');
            process.exit(1);
        });

        const queueCreator = new QueueCreator(channel);
        const queuePubSub = new QueuePubSub(channel)

        const mongooseOptions = {
            socketTimeoutMS: 60000,
        };
        await mongoose.connect(config.get('MONGODB_URI'), mongooseOptions);
        const iamClient = iamUtils.createClient({
            iamToken: config.get('IAM_TOKEN'),
            baseUrl: config.get('IAM_BASE_URL')
        });

        container.register({
            queueCreator: asValue(queueCreator),
            queuesManager: asClass(RabbitMqQueuesManager),
            queuePubSub: asValue(queuePubSub),
            channel: asValue(channel),
            iamClient: asValue(iamClient),
            flowsDao: asClass(FlowsDao),
            flowStateDao: asClass(FlowStateDao),
            componentsDao: asClass(ComponentsDao),
            secretsDao: asClass(SecretsDao),
            tokensDao: asClass(TokensDao),
            snapshotsDao: asClass(SnapshotsDao),
            httpApi: asClass(HttpApi).singleton(),
            driver: asClass(KubernetesDriver),
            credentialsStorage: asClass(MongoDbCredentialsStorage),
            eventBus: asClass(EventBus, {
                injector: () => ({
                    serviceName: this.constructor.NAME,
                    rabbitmqUri: config.get('RABBITMQ_URI'),
                    transport: undefined, // using default transport
                    onCloseCallback: undefined,
                })
            }).singleton(),
            componentOrchestrator: asClass(ComponentOrchestrator)
        });

        container.loadModules(['./src/event-handlers/**/*.js'], {
            formatName: 'camelCase',
            resolverOptions: {
                register: asFunction
            }
        });

        const httpApi = container.resolve('httpApi');
        httpApi.listen(config.get('LISTEN_PORT'));

        await container.resolve('eventHandlers').connect();
        const componentOrchestrator = container.resolve('componentOrchestrator');
        await componentOrchestrator.start();
    }

    static get NAME() {
        return 'component-orchestrator';
    }
}
module.exports = ComponentOrchestratorApp;
