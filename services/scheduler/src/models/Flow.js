const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const cronParser = require('cron-parser');

const schema = new Schema({
    graph: Schema.Types.Mixed,
    cron: String,
    dueExecution: Date
});
//@todo: indexes

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

    updateDueExecutionAccordingToCron() {
        const interval = cronParser.parseExpression(this.cron);
        this.dueExecution = interval.next();
    }

    static findForScheduling({ limit = 20 } = {}) {
        const currentDateTime = new Date();
        const query = {
            dueExecution: {
                $exists: true,
                $lt: currentDateTime
            }
        };

        const queryOptions = {
            sort: {
                dueExecution: 1
            },
            limit
        };

        return this.find(query, null, queryOptions);
    }
}

schema.loadClass(Flow);

module.exports = mongoose.model('Flow', schema);
