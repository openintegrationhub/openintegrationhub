const Lib = require('backend-commons-lib');
const {
    // QueueCreator,
    App
} = Lib;

const FlowsDao = require('./FlowsDao');
const MessagePublisher = require('./MessagePublisher');
const { RequestHandlers, HttpApi } = require('@openintegrationhub/webhooks');
const mongoose = require('mongoose');
const { EventBus } = require('@openintegrationhub/event-bus');
const { PostRequestHandler } = require('./request-handlers/post');

class WebhooksApp extends App {
    async _run () {
        const { asClass, asFunction } = this.awilix;
        const container = this.getContainer();
        const config = container.resolve('config');
        const logger = container.resolve('logger');
        // const amqp = container.resolve('amqp');
        // await amqp.start();
        // const channel = await amqp.getConnection().createChannel();
        // const queueCreator = new QueueCreator(channel);

        const mongooseOptions = {
            socketTimeoutMS: 60000,
            useCreateIndex: true,
            useNewUrlParser: true
        };
        await mongoose.connect(config.get('MONGODB_URI'), mongooseOptions);

        container.register({
            // channel: asValue(channel),
            flowsDao: asClass(FlowsDao),
            messagePublisher: asClass(MessagePublisher),
            httpApi: asClass(HttpApi).singleton(),
            eventBus: asClass(EventBus, {
                injector: () => ({
                    serviceName: this.constructor.NAME,
                    rabbitmqUri: config.get('RABBITMQ_URI'),
                    transport: undefined,
                    onCloseCallback: undefined,
                    onErrorCallback: undefined,
                    onReconnectCallback: undefined,
                })
            }).singleton(),
        });

        container.loadModules(['./src/event-handlers/**/*.js'], {
            formatName: 'camelCase',
            resolverOptions: {
                register: asFunction
            }
        });

        await container.resolve('eventHandlers').connect();

        const httpApi = container.resolve('httpApi');
        const messagePublisher = container.resolve('messagePublisher');
        httpApi.setLogger(logger);
        httpApi.setHeadHandler((req, res) => new RequestHandlers.Head(req, res).handle());
        httpApi.setGetHandler((req, res) => new RequestHandlers.Get(req, res, messagePublisher).handle());
        httpApi.setPostHandler((req, res) => new PostRequestHandler(req, res, messagePublisher, config).handle());
        httpApi.listen(config.get('LISTEN_PORT'));
    }

    static get NAME() {
        return 'webhooks';
    }
}

module.exports = WebhooksApp;
