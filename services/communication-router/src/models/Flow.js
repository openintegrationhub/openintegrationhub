const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    graph: Schema.Types.Mixed,
    status: String
});

Object.assign(schema.methods, {
    getFirstNode() {
        return this.graph.nodes.find(n => n.first); //@todo: edit this logic
    }
});

module.exports = mongoose.model('Flow', schema);
