const { FlowsDao } = require('@openintegrationhub/component-orchestrator');
const Flow = require('../models/Flow');

class OIHFlowsDao extends FlowsDao {
    /**
     * Find all flows.
     * @returns {Promise<Flow[]>}
     */
    findAll() {
        return Flow.find({});
    }

    findById(id) {
        return Flow.findById(id);
    }
}

module.exports = OIHFlowsDao;
