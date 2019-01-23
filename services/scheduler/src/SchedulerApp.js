const express = require('express');
const {
    QueueCreator,
    App,
    K8sService,
    AMQPService
} = require('backend-commons-lib');
const { Scheduler } = require('@openintegrationhub/scheduler');
const FlowsDao = require('./FlowsDao');
const SchedulePublisher = require('./SchedulePublisher');

class SchedulerApp extends App {
    async _run() {
        this._amqp = new AMQPService(this);
        this._k8s = new K8sService(this);
        await this._amqp.start();
        await this._k8s.start();
        this._initHealthcheckApi(this.getConfig().get('LISTEN_PORT'));
        this._channel = await this._amqp.getConnection().createChannel();
        this._queueCreator = new QueueCreator(this._channel);

        const flowsDao = new FlowsDao(this.getConfig(), this.getLogger(), this.getK8s().getCRDClient());
        const schedulePublisher = new SchedulePublisher(this.getLogger(), this.getQueueCreator(), this.getAmqpChannel());
        const scheduler = new Scheduler(this.getConfig(), flowsDao, schedulePublisher);
        await scheduler.run();
    }

    getK8s() {
        return this._k8s;
    }

    getAmqpChannel() {
        return this._channel;
    }

    getQueueCreator() {
        return this._queueCreator;
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
