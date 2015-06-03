exports.process = processAction;
exports.getMetaModel = getMetaModel;
exports.getModel = getModel;

function processAction(msg, cfg){
}

function getMetaModel(cfg, cb) {
    return cb(null, 'metamodel');
}

function getModel(cfg, cb) {
    return cb(null, 'model')
}