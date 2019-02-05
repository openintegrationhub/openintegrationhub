const Lib = require('backend-commons-lib');
const {
    QueueCreator,
    App
} = Lib;

const FlowsDao = require('./FlowsDao');
const MessagePublisher = require('./MessagePublisher');
const { RequestHandlers, HttpApi } = require('@openintegrationhub/webhooks');
const { asValue, asClass } = require('awilix');

class CommunicationRouterApp extends App {
    async _run () {
        const container = this.getContainer();
        const config = container.resolve('config');
        const logger = container.resolve('logger');
        const amqp = container.resolve('amqp');
        const k8s = container.resolve('k8s');

        await amqp.start();
        await k8s.start();
        const channel = await amqp.getConnection().createChannel();
        const queueCreator = new QueueCreator(channel);

        container.register({
            channel: asValue(channel),
            queueCreator: asValue(queueCreator),
            crdClient: asValue(k8s.getCRDClient()),
            flowsDao: asClass(FlowsDao),
            messagePublisher: asClass(MessagePublisher),
            httpApi: asClass(HttpApi).singleton()
        });

        const httpApi = container.resolve('httpApi');
        const messagePublisher = container.resolve('messagePublisher');
        httpApi.setLogger(logger);
        httpApi.setHeadHandler((req, res) => new RequestHandlers.Head(req, res).handle());
        httpApi.setGetHandler((req, res) => new RequestHandlers.Get(req, res, messagePublisher).handle());
        httpApi.setPostHandler((req, res) => new RequestHandlers.Post(req, res, messagePublisher).handle());
        httpApi.listen(config.get('LISTEN_PORT'));
    }

    static get NAME() {
        return 'communication-router';
    }
}

module.exports = CommunicationRouterApp;
