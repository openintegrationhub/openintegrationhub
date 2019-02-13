const express = require('express');
const {
    QueueCreator,
    App
} = require('backend-commons-lib');
const { Scheduler } = require('@openintegrationhub/scheduler');
const FlowsDao = require('./FlowsDao');
const SchedulePublisher = require('./SchedulePublisher');
const { asValue, asClass } = require('awilix');
const { EventBus, RabbitMqTransport } = require('@openintegrationhub/event-bus');
const mongoose = require('mongoose');
const Flow = require('./models/Flow');

class SchedulerApp extends App {
    async _run() {
        const container = this.getContainer();
        const config = container.resolve('config');
        const logger = container.resolve('logger');
        const amqp = container.resolve('amqp');
        // const k8s = container.resolve('k8s');
        await amqp.start();
        // await k8s.start();
        this._initHealthcheckApi(config.get('LISTEN_PORT'));
        const channel = await amqp.getConnection().createChannel();
        const queueCreator = new QueueCreator(channel);

        await mongoose.connect(config.get('MONGODB_URI'), {useNewUrlParser: true});

        const transport = new RabbitMqTransport({rabbitmqUri: config.get('RABBITMQ_URI')});
        const eventBus = new EventBus({transport, serviceName: this.constructor.NAME});
        await eventBus.connect();

        //@todo: provide some specific topic
        await eventBus.subscribe({topic: '*.*'}, async (event) => {
            logger.trace({event}, 'Received event');

            try {
                let flow = await Flow.findById(event.payload.id);
                if (!flow) {
                    flow = new Flow({_id: event.payload.id});
                }
                if (!event.payload.cron) {
                    event.payload.cron = undefined; // in order to delete the cron field
                }
                Object.assign(flow, event.payload);

                if (flow.cron) {
                    //@todo: some validation?
                    flow.updateDueExecutionAccordingToCron();
                    //@todo: delete if wrong status
                    await flow.save();
                } else {
                    await Flow.deleteOne({_id: flow.id});
                }
                await event.ack();
            } catch (err) {
                logger.error({ err, event }, 'Unable to process event');
                await event.nack();
            }
        });

        container.register({
            // crdClient: asValue(k8s.getCRDClient()),
            channel: asValue(channel),
            queueCreator: asValue(queueCreator),
            flowsDao: asClass(FlowsDao),
            schedulePublisher: asClass(SchedulePublisher),
            scheduler: asClass(Scheduler).singleton()
        });

        const scheduler = container.resolve('scheduler');
        await scheduler.run();
    }

    _initHealthcheckApi(listenPort) {
        const app = express();
        app.get('/healthcheck', (req, res) => {
            res.status(200).end();
        });
        app.listen(listenPort);
    }

    static get NAME() {
        return 'scheduler';
    }
}

module.exports = SchedulerApp;
