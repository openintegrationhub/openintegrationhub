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

    getFirstNode() {
        const nodes = this.getNodes();
        const edges = this.getEdges();

        if (nodes.length === 0) {
            return null;
        } else if (nodes.length === 1) {
            return nodes[0];
        }

        if (edges.length === 0) {
            return null;
        }

        return nodes.find(node => !edges.find(edge => edge.target === node.id));
    }

    getNodeById(id) {
        return this.getNodes().find(node => node.id === id);
    }

    getNodes() {
        return this.graph.nodes || [];
    }

    getEdges() {
        return this.graph.edges || [];
    }

    onStarted() {
        return;
    }

    onStopped() {
        return;
    }
}

module.exports = Flow;
