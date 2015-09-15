var Q = require('q');
var _ = require('lodash');
var assert = require('assert');
var request = require('request');
var util = require('util');
var ComponentReader = require('./component_reader').ComponentReader;
var compReader = new ComponentReader();

var ALLOWED_METHODS = {
    verifyCredentials: verifyCredentials,
    getMetaModel: getMetaModel,
    selectModel: selectModel
};

exports.processService = processService;

function processService(serviceMethod, env){

    var POST_RESULT_URL = env.POST_RESULT_URL;
    var CFG = env.CFG;
    var ACTION_OR_TRIGGER = env.ACTION_OR_TRIGGER;
    var GET_MODEL_METHOD = env.GET_MODEL_METHOD;
    var COMPONENT_PATH = env.COMPONENT_PATH;

    return Q.fcall(init)
        .spread(execService)
        .then(onSuccess)
        .catch(onError);

    function init() {

        assert(ALLOWED_METHODS[serviceMethod], util.format('Unknown service method "%s"', serviceMethod));
        assert(CFG, 'CFG is not provided');

        if (serviceMethod === "getMetaModel" || serviceMethod === "selectModel") {
            assert(ACTION_OR_TRIGGER, 'ACTION_OR_TRIGGER is not provided');
        }
        if (serviceMethod === "selectModel") {
            assert(GET_MODEL_METHOD, 'GET_MODEL_METHOD is not provided');
        }

        var cfg;
        try {
            cfg = JSON.parse(CFG);
        } catch (e) {
            throw new Error('Unable to parse CFG');
        }

        var params = {
            triggerOrAction: ACTION_OR_TRIGGER,
            getModelMethod: GET_MODEL_METHOD
        };

        return [cfg, params];
    }

    function execService(cfg, params) {
        return compReader.init(COMPONENT_PATH).then(callMethod);
        function callMethod() {
            return ALLOWED_METHODS[serviceMethod](cfg, params);
        }
    }

    function onSuccess(data) {
        return sendResponse({status: 'success', data: data});
    }

    function onError(err) {
        var errorData = {
            message: err.message
        };
        return sendResponse({status: 'error', data: errorData});
    }

    function sendResponse(responseBody){
        assert(POST_RESULT_URL, 'POST_RESULT_URL is not provided');
        var opts = {
            url: POST_RESULT_URL,
            json: true,
            rejectUnauthorized: false,
            body: responseBody
        };
        return Q.ninvoke(request, 'post', opts).then(returnBody);
        function returnBody() {
            return responseBody;
        }
    }
}

function verifyCredentials(cfg, params) {
    function doVerification(verify) {
        return Q.nfcall(verify, cfg);
    }

    function error(e) {
        return {
            verified: false,
            reason: e.message
        };
    }

    return compReader.loadVerifyCredentials()
        .then(doVerification)
        .catch(error);
}

function getMetaModel(cfg, params) {
    return callModuleMethod(params.triggerOrAction, 'getMetaModel', cfg);
}

function selectModel(cfg, params) {
    return callModuleMethod(params.triggerOrAction, params.getModelMethod, cfg);
}

function callModuleMethod(triggerOrAction, method, cfg) {
    function getModel(module) {
        assert(method in module, util.format('Method "%s" is not found in "%s" action or trigger', method, triggerOrAction));
        return Q.nfcall(module[method], cfg);
    }
    return compReader.loadTriggerOrAction(triggerOrAction).then(getModel);
}