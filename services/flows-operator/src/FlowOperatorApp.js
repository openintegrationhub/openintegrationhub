const Lib = require('backendCommonsLib');
const {
    QueueCreator,
    App,
    K8sService,
    AMQPService
} = Lib;

const FlowOperator = require('./FlowOperator.js');
const RabbitmqManagementService = require('./RabbitmqManagementService.js');
const HttpApi = require('./HttpApi.js');
const KubernetesDriver = require('./drivers/kubernetes/KubernetesDriver');
const FlowsDao = require('./dao/FlowsK8sDao');

class FlowOperatorApp extends App {
    async _run() {
        this._amqp = new AMQPService(this);
        this._rabbitmqManagement = new RabbitmqManagementService(this.getConfig(), this.getLogger());
        await this._rabbitmqManagement.start();
        this._k8s = new K8sService(this);
        await this._amqp.start();
        await this._k8s.start();
        const flowsDao = new FlowsDao(this.getK8s());
        this._httpApi = new HttpApi(this.getConfig(), this.getLogger(), flowsDao);
        this._httpApi.listen(this.getConfig().get('LISTEN_PORT'));
        const channel = await this._amqp.getConnection().createChannel();
        this._queueCreator = new QueueCreator(channel);

        const driver = new KubernetesDriver(this.getConfig(), this.getLogger(), this.getK8s());
        const flowOperator = new FlowOperator(
            this.getConfig(),
            this.getLogger(),
            this.getQueueCreator(),
            this.getRabbitmqManagement(),
            this.getAmqp().getConnection(),
            flowsDao,
            driver
        );
        await flowOperator.start();
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
