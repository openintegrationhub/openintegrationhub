class RunningNode {
    get id() {
        return this.getId();
    }

    get flowId() {
        return this.getFlowId();
    }

    get nodeId() {
        return this.getNodeId();
    }

    getId() {
        throw new Error('To be implemented');
    }

    getFlowId() {
        throw new Error('To be implemented');
    }

    getNodeId() {
        throw new Error('To be implemented');
    }
}

module.exports = RunningNode;
