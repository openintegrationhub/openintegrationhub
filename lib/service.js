var Q = require('q');
var _ = require('lodash');
var assert = require('assert');
var request = require('request');
var util = require('util');
var ComponentReader = require('./component_reader').ComponentReader;
var EventEmitter = require('events').EventEmitter;
var ApiClient = require('./apiClient.js');

exports.processService = processService;

function processService(serviceMethod, env){

    var ALLOWED_METHODS = {
        verifyCredentials: verifyCredentials,
        getMetaModel: getMetaModel,
        selectModel: selectModel
    };

    var POST_RESULT_URL = env.ELASTICIO_POST_RESULT_URL;
    var CFG = env.ELASTICIO_CFG;
    var ACTION_OR_TRIGGER = env.ELASTICIO_ACTION_OR_TRIGGER;
    var GET_MODEL_METHOD = env.ELASTICIO_GET_MODEL_METHOD;
    var COMPONENT_PATH = env.ELASTICIO_COMPONENT_PATH;
    var API_URI = env.ELASTICIO_API_URI;
    var API_USERNAME = env.ELASTICIO_API_USERNAME;
    var API_KEY = env.ELASTICIO_API_KEY;

    var compReader = new ComponentReader();

    return Q.fcall(init)
        .spread(execService)
        .then(onSuccess)
        .catch(onError);

    function init() {

        assert(ALLOWED_METHODS[serviceMethod], util.format('Unknown service method "%s"', serviceMethod));
        assert(CFG, 'ELASTICIO_CFG is not provided');
        assert(CFG, 'ELASTICIO_API_URI is not provided');
        assert(CFG, 'ELASTICIO_API_USERNAME is not provided');
        assert(CFG, 'ELASTICIO_API_KEY is not provided');

        if (serviceMethod === "getMetaModel" || serviceMethod === "selectModel") {
            assert(ACTION_OR_TRIGGER, 'ELASTICIO_ACTION_OR_TRIGGER is not provided');
        }
        if (serviceMethod === "selectModel") {
            assert(GET_MODEL_METHOD, 'ELASTICIO_GET_MODEL_METHOD is not provided');
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
        if (err.sendable === false) {
            throw new Error(err.message);
        }
        var errorData = {
            message: err.message
        };
        console.error(err.stack);
        return sendResponse({status: 'error', data: errorData});
    }

    function sendResponse(responseBody){
        assert(POST_RESULT_URL, 'ELASTICIO_POST_RESULT_URL is not provided');
        var opts = {
            url: POST_RESULT_URL,
            json: true,
            rejectUnauthorized: false,
            body: responseBody
        };

        return Q.ninvoke(request, 'post', opts)
            .spread(checkStatusCode)
            .then(returnBody);

        function checkStatusCode(response, body) {
            if (response.statusCode != '200') {
                var error = new Error(util.format(
                    'Failed to POST data to %s (%s, %s)',
                    POST_RESULT_URL, response.statusCode, body
                ));
                error.sendable = false;
                throw error;
            }
        }
        function returnBody() {
            return responseBody;
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

        var callScope = new EventEmitter();
        callScope.on('updateKeys', onUpdateKeys);

        var finished = Q.defer();
        var subPromises = [];

        compReader.loadTriggerOrAction(triggerOrAction)
            .then(executeMethod)
            .then(onSuccess)
            .catch(onFail)
            .done();

        function executeMethod(module) {
            assert(_.isFunction(module[method]), util.format('Method "%s" is not found in "%s" action or trigger', method, triggerOrAction));
            return Q.nbind(module[method], callScope)(cfg);
        }

        function onSuccess(data) {
            Q.allSettled(subPromises).then(function(res){
                finished.resolve(data);
            });
        }

        function onFail(err) {
            finished.reject(err);
        }

        function onUpdateKeys(keys) {
            var apiClient = new ApiClient(API_URI).auth(API_USERNAME, API_KEY);
            addPromise(apiClient.updateKeys(cfg._account, keys));
        }

        function addPromise(p) {
            subPromises.push(p);
        }

        return finished.promise;
    }
}

