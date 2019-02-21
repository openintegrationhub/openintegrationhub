const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    graph: Schema.Types.Mixed,
    status: String
});

Object.assign(schema.methods, {
    // // delete containers when flow is deleted
    // get isDeleted() {
    //     // @todo: implement
    //     // return !!this.metadata.deletionTimestamp;
    // },

    // // if found a flow for the first time - create queues
    // get isNew() {
    //     // @todo: implement
    //     // return !(this.metadata.finalizers || []).includes(this.constructor.FLOW_FINALIZER_NAME);
    // },

    // // used for determining if redeploy is required
    // get version() {
    //     // @todo: implement
    //     // return this.metadata.resourceVersion;
    // },

    getFirstNode() {
        return this.graph.nodes.find(node => node.first); //@todo: edit this logic
    },

    getNodeById(id) {
        return this.graph.nodes.find(node => node.id === id);
    }
});

module.exports = mongoose.model('Flow', schema);
