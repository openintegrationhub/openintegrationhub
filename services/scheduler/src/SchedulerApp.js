const express = require('express');

const Lib = require('lib');
const { 
    QueueCreator,
    App,
    K8sService,
    AMQPService
} = Lib;

const Scheduler = require('./Scheduler.js');


class SchedulerApp extends App {
    async _run() {
        this._amqp = new AMQPService(this);
        this._k8s = new K8sService(this);
        await this._amqp.start();
        await this._k8s.start();
        this._initHealthcheckApi(this.getConfig().get('LISTEN_PORT'));
        this._channel = await this._amqp.getConnection().createChannel();
        this._queueCreator = new QueueCreator(this._channel);
        new Scheduler(this);
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
        return 'flows-operator';
    }
}
module.exports = SchedulerApp;

