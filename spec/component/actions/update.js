var _ = require('lodash');

exports.process = processAction;
exports.getMetaModel = getMetaModel;
exports.getModel = getModel;

function processAction(msg, cfg, snapshot){
    if (msg.snapshot) {
        this.emit('snapshot', msg.snapshot);
    }
    if (msg.updateSnapshot) {
        this.emit('updateSnapshot', msg.updateSnapshot);
    }
    this.emit('end');
}

function getMetaModel(cfg, cb) {
    return cb(null, 'metamodel');
}

function getModel(cfg, cb) {
    return cb(null, 'model')
}