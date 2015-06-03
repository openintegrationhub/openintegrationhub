var Q = require('q');
var _ = require('lodash');
var assert = require('assert');
var ComponentReader = require('./component_reader').ComponentReader;
var compReader = new ComponentReader();

var COMPONENT_PATH = process.env.COMPONENT_PATH;

exports.execService = execService;

var allowedMethods = {
    verifyCredentials: verifyCredentials,
    getMetaModel: getMetaModel,
    selectModel: selectModel
};

function execService(method, cfg, params) {
    assert(_.contains(_.keys(allowedMethods), method), 'Unknown service method');

    function callMethod() {
        return allowedMethods[method](cfg, params);
    }

    return compReader.init(COMPONENT_PATH).then(callMethod);
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
        assert(method in module, 'Method not found');
        return Q.nfcall(module[method], cfg);
    }

    return compReader.loadTriggerOrAction(triggerOrAction).then(getModel);
}