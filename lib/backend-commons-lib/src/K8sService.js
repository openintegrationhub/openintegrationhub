const K8sApi = require('kubernetes-client');
const {Client, config} = K8sApi;

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
        const namespace = this._config.get('NAMESPACE');

        this._batchClient = client.apis.batch.v1.namespaces(namespace);
        this._coreClient = client.api.v1.namespaces(namespace);
    }

    getCoreClient() {
        return this._coreClient;
    }

    getBatchClient() {
        return this._batchClient;
    }

    async stop() {
        //Intentionally left blank
    }
}
module.exports = K8sService;
