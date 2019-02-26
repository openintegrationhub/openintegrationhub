class FlowsDao {
    /**
     * Find flow by ID
     * @param id
     * @return {Promise<Flow>}
     */
    findById(id) { //eslint-disable-line
        throw new Error('To be implemented');
    }

    /**
     * Find all flows
     * @return {Promise<Flow[]>}
     */
    findAll() { //eslint-disable-line
        throw new Error('To be implemented');
    }
}

module.exports = FlowsDao;
