/**
 * Abstraction layer for accessing a flow's data.
 */
class FlowsDao {
    /**
     * Find an array of flows ready to be scheduled.
     * @returns {Promise<Flow>} An array of Flows.
     */
    async findForScheduling() { //eslint-disable-line no-unused-vars
        throw new Error('To be implemented');
    }

    /**
     * Schedule a next flow execution.
     * @param {Flow} flow
     * @returns {Promise<void>}
     */
    async planNextRun(flow) { //eslint-disable-line no-unused-vars
        throw new Error('To be implemented');
    }
}

module.exports = FlowsDao;
