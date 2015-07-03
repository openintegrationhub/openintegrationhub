exports.process = processAction;
exports.getMetaModel = getMetaModel;
exports.getModel = getModel;

function processAction(msg, cfg, next, snapshot){
    snapshot.blabla = 'blablabla';
    this.emit('snapshot', snapshot);
    this.emit('updateSnapshot', {some: 'updatedValue'});
    this.emit('end', msg);
}

function getMetaModel(cfg, cb) {
    return cb(null, 'metamodel');
}

function getModel(cfg, cb) {
    return cb(null, 'model')
}