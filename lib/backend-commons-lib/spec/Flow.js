class Flow {
    constructor(payload) {
        Object.assign(this, payload);
    }

    getFirstNode() {
        const nodes = this.graph.nodes || [];
        const edges = this.graph.edges || [];

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
        return this.graph.nodes.find(node => node.id === id);
    }
}

module.exports = Flow;
