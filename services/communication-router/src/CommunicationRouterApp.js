const Lib = require('backend-commons-lib');
const {
    QueueCreator,
    App
} = Lib;

const FlowsDao = require('./FlowsDao');
const MessagePublisher = require('./MessagePublisher');
const { RequestHandlers, HttpApi } = require('@openintegrationhub/webhooks');
const { asValue, asClass } = require('awilix');
const mongoose = require('mongoose');
const { RabbitMqTransport, EventBus } = require('@openintegrationhub/event-bus');
const Flow = require('./models/Flow');

class CommunicationRouterApp extends App {
    async _run () {
        const container = this.getContainer();
        const config = container.resolve('config');
        const logger = container.resolve('logger');
        const amqp = container.resolve('amqp');
        await amqp.start();
        const channel = await amqp.getConnection().createChannel();
        const queueCreator = new QueueCreator(channel);
        await mongoose.connect(config.get('MONGODB_URI'), {useNewUrlParser: true});

        const transport = new RabbitMqTransport({rabbitmqUri: config.get('RABBITMQ_URI')});
        const eventBus = new EventBus({logger, transport, serviceName: this.constructor.NAME});
        eventBus.subscribe('flow.started', async (event) => {
            try {
                let flow = await Flow.findById(event.payload.id);
                if (!flow) {
                    flow = new Flow({_id: event.payload.id});
                }
                if (!event.payload.cron) {
                    event.payload.cron = undefined; // in order to delete the cron field
                }
                Object.assign(flow, event.payload);

                if (event.payload.cron) {
                    //@todo: remove if status is stopped
                    await Flow.deleteOne({_id: flow.id});
                } else {
                    await flow.save();
                }
                await event.ack();
            } catch (err) {
                logger.error({ err, event }, 'Unable to process event');
                await event.nack();
            }
        });

        eventBus.subscribe('flow.stopped', async (event) => {
            try {
                await Flow.deleteOne({_id: event.payload.id});
                await event.ack();
            } catch (err) {
                logger.error({ err, event }, 'Unable to process event');
                await event.nack();
            }
        });

        await eventBus.connect();

        container.register({
            channel: asValue(channel),
            queueCreator: asValue(queueCreator),
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
