/**
 * @typedef Flow
 * Example of the model, which is expected to be returned by the FlowsDao
 */
class Flow {
    constructor(payload) {
        Object.assign(this, payload);
    }

    get isStarting() {
        return this.status === 'starting';
    }

    get isStopping() {
        return this.status === 'stopping';
    }

    getNodeById(id) {
        return this.getNodes().find(node => node.id === id);
    }

    getNodes() {
        return this.graph.nodes;
    }

    onStarted() {
        return;
    }

    onStopped() {
        return;
    }
}

module.exports = Flow;
