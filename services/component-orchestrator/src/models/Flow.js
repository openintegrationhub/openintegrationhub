const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    tenant: {
        type: String
    },
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

    get isPreparing() {
        return this.status.includes('preparing-by')
    }

    preparingBy(orchestratorId) {
        return this.status === `preparing-by-${orchestratorId}`
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

    getNextSteps(steppId) {
        return this.graph.edges
            .filter(edge => edge.source === steppId)
            .map(edge => edge.target)
    }

    getPropertiesByNodeId(nodeId) {
        return this.graph.nodes.find(node => node.id === nodeId)
    }

    getEdges() {
        return this.graph.edges || [];
    }

    async onStarting(orchestratorId) {
        this.status = `preparing-by-${orchestratorId}`;
        return this.save();
    }

    async onPrepared() {
        this.status = 'prepared';
        return this.save();
    }

    async onStarted() {
        this.status = 'started';
        return this.save();
    }

    async onStopped() {
        return this.remove();
    }
}

schema.loadClass(Flow);

module.exports = mongoose.model('Flow', schema);
