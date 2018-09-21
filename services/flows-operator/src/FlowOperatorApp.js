const Lib = require('lib');
const { 
    QueueCreator,
    App,
    K8sService,
    AMQPService
} = Lib;

const FlowOperator = require('./FlowOperator.js');
const RabbitmqManagementService = require('./RabbitmqManagementService.js');
const HttpApi = require('./HttpApi.js');

class FlowOperatorApp extends App {
    async _run() {
        this._amqp = new AMQPService(this);
        this._rabbitmqManagement = new RabbitmqManagementService(this);
        await this._rabbitmqManagement.start();
        this._k8s = new K8sService(this);
        await this._amqp.start();
        await this._k8s.start();
        this._httpApi = new HttpApi(this);
        this._httpApi.listen(this.getConfig().get('LISTEN_PORT'));
        const channel = await this._amqp.getConnection().createChannel();
        this._queueCreator = new QueueCreator(channel);
        new FlowOperator(this);
    }

    getK8s() {
        return this._k8s;
    }

    getQueueCreator() {
        return this._queueCreator;
    }

    getRabbitmqManagement() {
        return this._rabbitmqManagement;
    }

    getAmqp() {
        return this._amqp;
    }

    static get NAME() {
        return 'flows-operator';
    }
}
module.exports = FlowOperatorApp
