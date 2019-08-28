const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    graph: {
        type: Schema.Types.Mixed
    },
    status: {
        type: String
    },
    startedBy: {
        type: String
    }
});

class Flow {
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
        this.status = 'started';
        return this.save();
    }

    onStopped() {
        return this.remove();
    }
}

schema.loadClass(Flow);

module.exports = mongoose.model('Flow', schema);
