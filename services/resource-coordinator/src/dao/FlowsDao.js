const { FlowsDao } = require('@openintegrationhub/resource-coordinator');
const Flow = require('../models/Flow');

class OIHFlowsDao extends FlowsDao {
    /**
     * Finds flow by ID.
     * @param id
     * @returns {Promise<Flow>}
     */
    findById(id) {
        return Flow.findById(id);
    }

    /**
     * Updates a flow.
     * @param flow
     * @returns {*}
     */
    update(flow) {
        return flow.save();
    }

    /**
     * Find all flows.
     * @returns {Promise<Flow[]>}
     */
    findAll() {
        return Flow.find({});
    }

    async ensureFinalizer(flow) {
        //left blank intentionally
    }

    async removeFinalizer(flow) {
        return flow.remove();
    }
}

module.exports = OIHFlowsDao;
