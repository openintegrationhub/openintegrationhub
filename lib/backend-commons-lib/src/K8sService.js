const { Client } = require('kubernetes-client');

class K8sService {
    constructor({ config, logger }) {
        this._config = config;
        this._logger = logger;
    }

    async start() {

        const client = new Client({ version: '1.13' });
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
