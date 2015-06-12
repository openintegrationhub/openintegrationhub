var Q = require('q');
var request = require('request');
var logging = require('./lib/logging');
var execService = require('./lib/service').execService;

var POST_RESULT_URL = process.env.POST_RESULT_URL;
var CFG = process.env.CFG;
var ACTION_OR_TRIGGER = process.env.ACTION_OR_TRIGGER;
var GET_MODEL_METHOD = process.env.GET_MODEL_METHOD;

var serviceMethod = process.argv[2];

Q.fcall(init)
    .spread(execService)
    .then(sendResponse)
    .catch(logging.criticalError)
    .done();

function init() {
    var cfg;
    try {
        cfg = JSON.parse(CFG);
    } catch (e) {
        throw new Error('Unable to parse config');
    }

    var params = {
        triggerOrAction: ACTION_OR_TRIGGER,
        getModelMethod: GET_MODEL_METHOD
    };

    return [serviceMethod, cfg, params];
}

function sendResponse(result) {
    var opts = {
        url: POST_RESULT_URL,
        json: true,
        body: result
    };
    return Q.ninvoke(request, 'post', opts);
}