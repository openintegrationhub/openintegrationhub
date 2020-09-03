const { Client } = require('kubernetes-client');
const { KubeConfig } = require('kubernetes-client')
const Request = require('kubernetes-client/backends/request')
const path = require('path')

class K8sService {
    constructor({ config, logger }) {
        this._config = config;
        this._logger = logger;
    }

    async start(kubeconfigPath=null) {

        let client = null

        if (kubeconfigPath) {
            const kubeconfig = new KubeConfig()
            kubeconfig.loadFromFile(path.resolve(kubeconfigPath))
            const backend = new Request({ kubeconfig })
            client = new Client({ backend, version: '1.13' })

        } else {
            client = new Client({ version: '1.13' });
        }

        const namespace = this._config.get('NAMESPACE');

        this._appsClient = client.apis.apps.v1.namespaces(namespace);
        this._batchClient = client.apis.batch.v1.namespaces(namespace);
        this._coreClient = client.api.v1.namespaces(namespace);
    }

    getCoreClient() {
        return this._coreClient;
    }

    getAppsClient() {
        return this._appsClient;
    }

    getBatchClient() {
        return this._batchClient;
    }

    async stop() {
        //Intentionally left blank
    }
}
module.exports = K8sService;