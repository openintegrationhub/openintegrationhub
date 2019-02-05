const express = require('express');
const {
    QueueCreator,
    App
} = require('backend-commons-lib');
const { Scheduler } = require('@openintegrationhub/scheduler');
const FlowsDao = require('./FlowsDao');
const SchedulePublisher = require('./SchedulePublisher');
const { asValue, asClass } = require('awilix');

class SchedulerApp extends App {
    async _run() {
        const container = this.getContainer();
        const config = container.resolve('config');
        const amqp = container.resolve('amqp');
        const k8s = container.resolve('k8s');
        await amqp.start();
        await k8s.start();
        this._initHealthcheckApi(config.get('LISTEN_PORT'));
        const channel = await amqp.getConnection().createChannel();
        const queueCreator = new QueueCreator(channel);

        container.register({
            crdClient: asValue(k8s.getCRDClient()),
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
