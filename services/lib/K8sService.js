const K8sApi = require('kubernetes-client');
const {Client, Batch, config} = K8sApi;
const CRD = require('./CRD.json');

class K8sService{
    constructor(app) {
        this._app = app;
    }
    async start() {
        const logger = this._app.getLogger();

        let k8sConnConfig;
        try {
            logger.info('going to get incluster config');
            k8sConnConfig =  config.getInCluster();
        } catch (e) {
            logger.info('going to get k8s config from ~/.kube/config');
            k8sConnConfig = config.fromKubeconfig();
        }

        const client = new Client({config: k8sConnConfig, version: '1.9'});

        try {
            await client.apis['apiextensions.k8s.io'].v1beta1.customresourcedefinitions.post({ body: CRD });
        } catch (e) {
            if (e.message.indexOf('already exists') !== -1) {
                logger.info('crd already exists');
            } else {
                logger.error(e, 'failed to crate crd');
                throw e;
            }
        }

        client.addCustomResourceDefinition(CRD);
        const namespace = this._app.getConfig().get('NAMESPACE');
        this._crdClient = client.apis['elastic.io'].v1.namespaces(namespace);
        this._batchClient = client.apis.batch.v1.namespaces(namespace);

    }
    getBatchClient() {
        return this._batchClient;
    }
    getCRDClient() {
        return this._crdClient; 
    }

    async stop() {
    }
}
module.exports = K8sService;
