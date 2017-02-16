var Q = require('q');
var _ = require('lodash');
var assert = require('assert');
var request = require('request');
var util = require('util');
var ComponentReader = require('./component_reader').ComponentReader;
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('sailor');
var RestApiClient = require('elasticio-rest-node');

exports.processService = processService;

function processService(serviceMethod, env) {

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
        debug('About to init');

        if (!POST_RESULT_URL) {
            var err = new Error('ELASTICIO_POST_RESULT_URL is not provided');
            err.sendable = false;
            throw err;
        }

        assert(ALLOWED_METHODS[serviceMethod], util.format('Unknown service method "%s"', serviceMethod));
        assert(CFG, 'ELASTICIO_CFG is not provided');
        assert(API_URI, 'ELASTICIO_API_URI is not provided');
        assert(API_USERNAME, 'ELASTICIO_API_USERNAME is not provided');
        assert(API_KEY, 'ELASTICIO_API_KEY is not provided');

        if (serviceMethod === 'getMetaModel' || serviceMethod === 'selectModel') {
            assert(ACTION_OR_TRIGGER, 'ELASTICIO_ACTION_OR_TRIGGER is not provided');
        }
        if (serviceMethod === 'selectModel') {
            assert(GET_MODEL_METHOD, 'ELASTICIO_GET_MODEL_METHOD is not provided');
        }

        var cfg;
        try {
            cfg = JSON.parse(CFG);
        } catch (e) {
            throw new Error('Unable to parse CFG');
        }

        debug('Config: %j', cfg);

        var params = {
            triggerOrAction: ACTION_OR_TRIGGER,
            getModelMethod: GET_MODEL_METHOD
        };

        return [cfg, params];
    }

    function execService(cfg, params) {
        debug('Init is complete. About to start execution.');

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
        console.error(err, err.stack);
        return sendResponse({status: 'error', data: errorData});
    }

    function sendResponse(responseBody) {
        var opts = {
            url: POST_RESULT_URL,
            json: true,
            rejectUnauthorized: false,
            body: responseBody
        };

        debug('About to send response back to the API');

        return Q.ninvoke(request, 'post', opts)
            .spread(checkStatusCode)
            .then(returnBody);

        function checkStatusCode(response, body) {
            if (response.statusCode != '200') {

                debug('Unable to reach API :(');

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
            return new Promise((resolve, reject) => {
                function legacyCallback(e, result) {
                    if (e) {
                        return reject(e);
                    }
                    resolve(result);
                }
                const result = verify(cfg, legacyCallback);

                if (result) {
                    resolve(result);
                }
            });
        }

        /**
         * In will allow developers to return Promise.resolve(ANYTHING) in verifyCredentials.
         */
        function toVerifyCredentialsResponse(result) {
            if (!_.has(result, 'verified')) {
                return {
                    verified: true
                };
            }

            return result;
        }

        function error(e) {
            return {
                verified: false,
                reason: e.message
            };
        }

        return compReader.loadVerifyCredentials()
            .then(doVerification)
            .then(toVerifyCredentialsResponse)
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
            .then(validateMethod)
            .then(executeMethod)
            .then(onExecutionSuccess)
            .catch(onExecutionFail)
            .done();

        function validateMethod(module) {
            var errorMsg = `Method "${method}" is not found in "${triggerOrAction}" action or trigger`;
            assert(_.isFunction(module[method]), errorMsg);
            return module;
        }

        function executeMethod(module) {
            return new Promise((resolve, reject) => {
                function legacyCallback(e, result) {
                    if (e) {
                        return reject(e);
                    }
                    resolve(result);
                }
                const result = module[method].bind(callScope)(cfg, legacyCallback);

                if (result) {
                    resolve(result);
                }
            });
        }

        function onExecutionSuccess(data) {
            Q.allSettled(subPromises).then(function resolve(res) {
                _(res)
                    .filter({state: 'rejected'})
                    .pluck('reason')
                    .each(console.error.bind(console))
                    .run();
                finished.resolve(data);
            });
        }

        function onExecutionFail(err) {
            finished.reject(err);
        }

        function onUpdateKeys(keys) {
            var apiClient = RestApiClient(API_USERNAME, API_KEY);
            addPromise(apiClient.accounts.update(cfg._account, {keys: keys}));
        }

        function addPromise(p) {
            subPromises.push(p);
        }

        return finished.promise;
    }
}
