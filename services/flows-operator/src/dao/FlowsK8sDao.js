const Lib = require('backendCommonsLib');
const { Flow } = Lib;
const { FlowsDao } = require('@openintegrationhub/resource-coordinator');
const FLOW_FINALIZER_NAME = 'finalizer.flows.elastic.io';

class FlowsK8sDao extends FlowsDao {
    constructor(k8s) {
        super();
        this._crdClient = k8s.getCRDClient();
    }

    async findById(id) {
        return new Flow((await this._crdClient.flows(id).get()).body);
    }

    update(flow) {
        return this._crdClient.flow(flow.id).put({
            body: flow.toCRD()
        });
    }

    async findAll() {
        return ((await this._crdClient.flows.get()).body.items || []).map(item => new Flow(item));
    }

    async ensureFinalizer(flow) {
        if (!(flow.metadata.finalizers || []).includes(FLOW_FINALIZER_NAME)) {
            flow.metadata.finalizers = (flow.metadata.finalizers || []).concat(FLOW_FINALIZER_NAME);
            //FIXME make sure 409 works. So non-sequential updates should go into next iteration
            //possibly handle revision field
            await this.update(flow);
        }
    }

    async removeFinalizer(flow) {
        // delete finalizer
        flow.metadata.finalizers = (flow.metadata.finalizers || []).filter(finalizer => finalizer !== FLOW_FINALIZER_NAME);
        //FIXME make sure 409 works. So non-sequential updates should go into next iteration
        //possibly handle revision field
        await this.update(flow);
    }
}

module.exports = FlowsK8sDao;
