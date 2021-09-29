const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    graph: Schema.Types.Mixed,
    status: String,
    flowSettings: {
        webhooks: {
            hmacAuthSecret: Schema.Types.ObjectId,
            requireWebhookAuth: Boolean,
            hmacHeaderKey: String,
            hmacAlgorithm: String,
        },
    },
    startedBy: Schema.Types.ObjectId,
});

class Flow {
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

    getFlowSettings() {
        return this.flowSettings.webhooks || null;
    }

    getFlowUser() {
        return this.startedBy || null;
    }
}

schema.loadClass(Flow);

module.exports = mongoose.model('Flow', schema);
