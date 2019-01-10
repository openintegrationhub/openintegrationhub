const Lib = require('backend-commons-lib');
const { Flow } = Lib;
const { FlowsDao } = require('@openintegrationhub/resource-coordinator');

class FlowsK8sDao extends FlowsDao {
    constructor(k8s) {
        super();
        this._crdClient = k8s.getCRDClient();
    }

    /**
     * Finds flow by ID.
     * @param id
     * @returns {Promise<Flow>}
     */
    async findById(id) {
        return new Flow((await this._crdClient.flows(id).get()).body);
    }

    /**
     * Updates a flow.
     * @param flow
     * @returns {*}
     */
    update(flow) {
        return this._crdClient.flow(flow.id).put({
            body: flow.toCRD()
        });
    }

    /**
     * Find all flows.
     * @returns {Promise<Flow[]>}
     */
    async findAll() {
        return ((await this._crdClient.flows.get()).body.items || []).map(item => new Flow(item));
    }

    async ensureFinalizer(flow) {
        if (flow.isNew) {
            flow.addFinalizer(Flow.FLOW_FINALIZER_NAME);
            //FIXME make sure 409 works. So non-sequential updates should go into next iteration
            //possibly handle revision field
            await this.update(flow);
        }
    }

    async removeFinalizer(flow) {
        flow.removeFinalizer(Flow.FLOW_FINALIZER_NAME);
        //FIXME make sure 409 works. So non-sequential updates should go into next iteration
        //possibly handle revision field
        await this.update(flow);
    }
}

module.exports = FlowsK8sDao;
