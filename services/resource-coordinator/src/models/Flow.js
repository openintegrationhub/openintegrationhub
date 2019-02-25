const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    graph: Schema.Types.Mixed,
    status: String
});

class Flow {
    getFirstNode() {
        return this.getNodes().find(node => node.first); //@todo: edit this logic
    }

    getNodeById(id) {
        return this.getNodes().find(node => node.id === id);
    }

    getNodes() {
        return this.graph.nodes;
    }
}

schema.loadClass(Flow);

module.exports = mongoose.model('Flow', schema);
