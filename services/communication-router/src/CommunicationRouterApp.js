const Lib = require('backend-commons-lib');
const {
    QueueCreator,
    App,
    K8sService,
    AMQPService
} = Lib;

const FlowsDao = require('./FlowsDao');
const MessagePublisher = require('./MessagePublisher');
const { RequestHandlers, HttpApi } = require('@openintegrationhub/webhooks');

class CommunicationRouterApp extends App {
    async _run () {
        this._amqp = new AMQPService(this);
        this._k8s = new K8sService(this);
        await this._amqp.start();
        await this._k8s.start();
        this._channel = await this._amqp.getConnection().createChannel();
        this._queueCreator = new QueueCreator(this._channel);

        const config = this.getConfig();
        const flowsDao = new FlowsDao(this.getK8s().getCRDClient());
        const messagePublisher = new MessagePublisher(this._queueCreator, this._channel);

        const httpApi = new HttpApi(config, flowsDao);
        httpApi.setLogger(this.getLogger());
        httpApi.setHeadHandler((req, res) => new RequestHandlers.Head(req, res).handle());
        httpApi.setGetHandler((req, res) => new RequestHandlers.Get(req, res, messagePublisher).handle());
        httpApi.setPostHandler((req, res) => new RequestHandlers.Post(req, res, messagePublisher).handle());

        this._httpApi = httpApi;
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
