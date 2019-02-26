const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    graph: Schema.Types.Mixed,
    status: String
});

class Flow {
    get isStarting() {
        return this.status === 'starting';
    }

    get isStopping() {
        return this.status === 'stopping';
    }

    getFirstNode() {
        return this.getNodes().find(node => node.first); //@todo: edit this logic
    }

    getNodeById(id) {
        return this.getNodes().find(node => node.id === id);
    }

    getNodes() {
        return this.graph.nodes;
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
