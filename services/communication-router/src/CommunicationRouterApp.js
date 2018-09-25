const Lib = require('backendCommonsLib');
const { 
    QueueCreator,
    App,
    K8sService,
    AMQPService
} = Lib;
const HttpApi = require('./HttpApi.js');

class CommunicationRouterApp extends App {
    async _run () {
        this._amqp = new AMQPService(this);
        this._k8s = new K8sService(this);
        await this._amqp.start();
        await this._k8s.start();
        this._channel = await this._amqp.getConnection().createChannel();
        this._queueCreator = new QueueCreator(this._channel);
        this._httpApi = new HttpApi(this);
        this._httpApi.listen(this.getConfig().get('LISTEN_PORT'));
    }

    getK8s() {
        return this._k8s;
    }

    getQueueCreator() {
        return this._queueCreator;
    }

    getAmqpChannel() {
        return this._channel;
    }

    static get NAME() {
        return 'communication-router';
    }
}
module.exports = CommunicationRouterApp;
