const Lib = require('backendCommonsLib');
const {
    QueueCreator,
    App,
    K8sService,
    AMQPService
} = Lib;

const { ResourceCoordinator } = require('@openintegrationhub/resource-coordinator');
const KubernetesDriver = require('./drivers/kubernetes/KubernetesDriver');
const RabbitmqManagementService = require('./RabbitmqManagementService');
const HttpApi = require('./HttpApi');
const FlowsK8sDao = require('./dao/FlowsK8sDao');

class ResourceCoordinatorApp extends App {
    async _run() {
        this._amqp = new AMQPService(this);
        this._rabbitmqManagement = new RabbitmqManagementService(this.getConfig(), this.getLogger());
        await this._rabbitmqManagement.start();
        this._k8s = new K8sService(this);
        await this._amqp.start();
        await this._k8s.start();
        const flowsDao = new FlowsK8sDao(this._k8s);
        this._httpApi = new HttpApi(this.getConfig(), this.getLogger(), flowsDao);
        this._httpApi.listen(this.getConfig().get('LISTEN_PORT'));
        const channel = await this._amqp.getConnection().createChannel();
        this._queueCreator = new QueueCreator(channel);

        const driver = new KubernetesDriver(this.getConfig(), this.getLogger(), this._k8s);
        const flowOperator = new ResourceCoordinator(
            this.getConfig(),
            this.getLogger(),
            this._queueCreator,
            this._rabbitmqManagement,
            this._amqp.getConnection(),
            flowsDao,
            driver
        );
        await flowOperator.start();
    }

    static get NAME() {
        return 'resource-coordinator';
    }
}
module.exports = ResourceCoordinatorApp;
