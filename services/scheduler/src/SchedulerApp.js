const express = require('express');
const {
    QueueCreator,
    App
} = require('backend-commons-lib');
const { Scheduler } = require('@openintegrationhub/scheduler');
const FlowsDao = require('./FlowsDao');
const SchedulePublisher = require('./SchedulePublisher');
const { EventBus } = require('@openintegrationhub/event-bus');
const mongoose = require('mongoose');

class SchedulerApp extends App {
    async _run() {
        const { asValue, asClass, asFunction } = this.awilix;
        const container = this.getContainer();
        const config = container.resolve('config');
        const amqp = container.resolve('amqp');
        await amqp.start();
        this._initHealthcheckApi(config.get('LISTEN_PORT'));
        const channel = await amqp.getConnection().createChannel();
        const queueCreator = new QueueCreator(channel);

        const mongooseOptions = {
            keepAliveInitialDelay: 300000,
            reconnectTries: 1000,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 60000,
        };
        await mongoose.connect(config.get('MONGODB_URI'), mongooseOptions);

        container.register({
            channel: asValue(channel),
            queueCreator: asValue(queueCreator),
            flowsDao: asClass(FlowsDao),
            schedulePublisher: asClass(SchedulePublisher),
            eventBus: asClass(EventBus, {
                injector: () => ({
                    serviceName: this.constructor.NAME,
                    rabbitmqUri: config.get('RABBITMQ_URI'),
                    transport: undefined,
                    onCloseCallback: undefined,
                })
            }).singleton(),
            scheduler: asClass(Scheduler).singleton()
        });

        container.loadModules(['./src/event-handlers/**/*.js'], {
            formatName: 'camelCase',
            resolverOptions: {
                register: asFunction
            }
        });

        await container.resolve('eventHandlers').connect();
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
