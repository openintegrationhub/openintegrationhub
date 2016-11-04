var _ = require('lodash');

exports.process = processAction;
exports.getMetaModel = getMetaModel;
exports.getModel = getModel;
exports.getModelWithKeysUpdate = getModelWithKeysUpdate;

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
    return cb(null, {
        'in': {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    title: 'Name'
                }
            }
        }
    });
}

function getModel(cfg, cb) {
    return cb(null, {
        de: 'Germany',
        us: 'USA',
        ua: 'Ukraine'
    });
}

function getModelWithKeysUpdate(cfg, cb) {
    this.emit('updateKeys', {oauth: {access_token: 'newAccessToken'}});
    return cb(null, {
        0: 'Mr',
        1: 'Mrs'
    });
}