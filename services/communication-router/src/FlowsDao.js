const { FlowsDao } = require('@openintegrationhub/webhooks');
const { Flow } = require('backend-commons-lib');

class OIH_FlowsDao extends FlowsDao {
    constructor(crdClient) {
        super();
        this._crdClient = crdClient;
    }

    async findById(id) {
        const flow = await this._crdClient.flows(id).get();
        if (!flow) {
            return null;
        }
        return new Flow(flow.body);
    }
}

module.exports = OIH_FlowsDao;
