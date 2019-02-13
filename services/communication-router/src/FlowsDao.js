const { FlowsDao } = require('@openintegrationhub/webhooks');
const Flow = require('./models/Flow');

class OIH_FlowsDao extends FlowsDao {
    /**
     * Find flow by ID.
     * @param id
     * @returns {Promise<Flow>}
     */
    findById(id) {
        //@todo: check if ID is a valid MongoID
        return Flow.findById(id);
    }
}

module.exports = OIH_FlowsDao;
