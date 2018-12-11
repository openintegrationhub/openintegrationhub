const Lib = require('backendCommonsLib');
const { Flow } = Lib;

class FlowsDao {
    constructor(k8s) {
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
        return ((await this._crdClient.flows.get()).body.items || []).map(f => new Flow(f.body));
    }
}

module.exports = FlowsDao;
