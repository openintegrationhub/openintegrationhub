const Q = require('q');
const request = require('request');

exports.process = processAction;
exports.getMetaModel = getMetaModel;
exports.getModel = getModel;
exports.getModelWithKeysUpdate = getModelWithKeysUpdate;
exports.promiseSelectModel = promiseSelectModel;
exports.promiseRequestSelectModel = promiseRequestSelectModel;
exports.promiseSelectModelRejected = promiseSelectModelRejected;

function processAction(msg, cfg, snapshot) {
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
        in: {
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
    this.emit('updateKeys', { oauth: { access_token: 'newAccessToken' } });
    return cb(null, {
        0: 'Mr',
        1: 'Mrs'
    });
}

function promiseSelectModel(cfg) {
    return Promise.resolve({
        de: 'de_DE',
        at: 'de_AT'
    });
}

function promiseRequestSelectModel(cfg) {
    const options = {
        uri: 'http://promise_target_url:80/selectmodel',
        json: true
    };

    return Q.ninvoke(request, 'get', options)
        .spread((req, body) => body);
}

function promiseSelectModelRejected(cfg) {
    return Promise.reject(new Error('Ouch. This promise is rejected'));
}
