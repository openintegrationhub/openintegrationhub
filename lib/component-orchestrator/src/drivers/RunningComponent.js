class RunningComponent {
    get id() {
        return this.getId();
    }

    get flowId() {
        return this.getFlowId();
    }

    get nodeId() {
        return this.getNodeId();
    }

    get componentId() {
        return this.getComponentId();
    }

    get type() {
        return this.getType();
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

    getComponentId() {
        throw new Error('To be implemented');
    }

    getType() {
        throw new Error('To be implemented');
    }
}

module.exports = RunningComponent;
