const assert = require('assert');
const K8sApi = require('kubernetes-client');
const {Client, config} = K8sApi;

const FlowCRD = require('../data/FlowCRD.json');
const SchedulerCRD= require('../data/SchedulerCRD.json');

class K8sService {
    constructor({config, logger}) {
        this._config = config;
        this._logger = logger;
    }

    async start() {
        let k8sConnConfig;
        try {
            this._logger.info('going to get incluster config');
            k8sConnConfig =  config.getInCluster();
        } catch (e) {
            this._logger.info('going to get k8s config from ~/.kube/config');
            k8sConnConfig = config.fromKubeconfig();
        }

        const client = new Client({config: k8sConnConfig, version: '1.9'});
        await this._installFlowCRD(client);
        await this._installSchedulerCRD(client);

        assert(FlowCRD.spec.group === SchedulerCRD.spec.group, 'All CRD\'s should be in same api group');
        const apiGroup = FlowCRD.spec.group;
        const namespace = this._config.get('NAMESPACE');

        this._crdClient = client.apis[apiGroup].v1.namespaces(namespace);
        this._batchClient = client.apis.batch.v1.namespaces(namespace);
        this._coreClient = client.api.v1.namespaces(namespace);
    }

    getCoreClient() {
        return this._coreClient;
    }

    getBatchClient() {
        return this._batchClient;
    }

    getCRDClient() {
        return this._crdClient;
    }

    async stop() {
        //Intentionally left blank
    }

    async _installFlowCRD(client) {
        await this._installCRD(client, FlowCRD);
    }

    async _installSchedulerCRD(client) {
        await this._installCRD(client, SchedulerCRD);
    }

    async _installCRD(client, CRDdefinition) {
        try {
            await client.apis['apiextensions.k8s.io'].v1beta1.customresourcedefinitions.post({body: CRDdefinition});
        } catch (e) {
            if (e.message.indexOf('already exists') !== -1) {
                this._logger.info({name: CRDdefinition.metadata.name}, 'crd already exists');
            } else {
                this._logger.error(e, 'failed to create crd');
                throw e;
            }
        }
        client.addCustomResourceDefinition(CRDdefinition);
    }
}
module.exports = K8sService;
