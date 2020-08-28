
/* eslint no-use-before-define: 0 */ // --> OFF

const Q = require('q');
const _ = require('lodash');
const assert = require('assert');
const request = require('requestretry');
const util = require('util');
const { EventEmitter } = require('events');
const debug = require('debug')('sailor');
const RestApiClient = require('elasticio-rest-node');
const { ComponentReader } = require('./component_reader');
const log = require('./logging');

const { ComponentLogger } = log;

/**
 * @class ServiceExec
 * Represents execution context for service method
 * Similar to TaskExec class for normal executions
 * TODO if it would be possible -- unify it with TaskExec
 */
class ServiceExec extends EventEmitter {
    constructor({ logger, services }) {
        super();
        this.logger = logger;
        this._services = services; // eslint-disable-line no-underscore-dangle
        assert(
            this._services.apiClient,
            'ServiceExec should be created with api client'
        ); // eslint-disable-line no-underscore-dangle
        assert(
            this._services.config,
            'ServiceExec should be created with config'
        ); // eslint-disable-line no-underscore-dangle
    }

    getApiClient() {
        return this._services.apiClient; // eslint-disable-line no-underscore-dangle
    }

    getConfig() {
        return this._services.config; // eslint-disable-line no-underscore-dangle
    }
}

function processService(serviceMethod, env) {
    const ALLOWED_METHODS = {
        verifyCredentials,
        getMetaModel,
        selectModel
    };

    const POST_RESULT_URL = env.ELASTICIO_POST_RESULT_URL;
    const CFG = env.ELASTICIO_CFG;
    const ACTION_OR_TRIGGER = env.ELASTICIO_ACTION_OR_TRIGGER;
    const GET_MODEL_METHOD = env.ELASTICIO_GET_MODEL_METHOD;
    const COMPONENT_PATH = env.ELASTICIO_COMPONENT_PATH;
    const API_URI = env.ELASTICIO_API_URI;
    const API_USERNAME = env.ELASTICIO_API_USERNAME;
    const API_KEY = env.ELASTICIO_API_KEY;

    const compReader = new ComponentReader();
    let apiClient;

    return Q.fcall(init)
        .spread(execService)
        .then(onSuccess)
        .catch(onError);

    function init() {
        debug('About to init');

        if (!POST_RESULT_URL) {
            const err = new Error('ELASTICIO_POST_RESULT_URL is not provided');
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

        let cfg;
        try {
            cfg = JSON.parse(CFG);
        } catch (e) {
            throw new Error('Unable to parse CFG');
        }

        debug('Config: %j', cfg);

        const params = {
            triggerOrAction: ACTION_OR_TRIGGER,
            getModelMethod: GET_MODEL_METHOD
        };
        // eslint-disable-next-line new-cap
        apiClient = RestApiClient(API_USERNAME, API_KEY, {
            retryCount: parseInt(env.ELASTICIO_API_REQUEST_RETRY_ATTEMPTS, 10),
            retryDelay: parseInt(env.ELASTICIO_API_REQUEST_RETRY_DELAY, 10)
        });

        return [cfg, params];
    }

    function execService(cfg, params) {
        debug('Init is complete. About to start execution.');

    return compReader.init(COMPONENT_PATH).then(callMethod); // eslint-disable-line

        function callMethod() {
            return ALLOWED_METHODS[serviceMethod](cfg, params);
        }
    }

    function onSuccess(data) {
        return sendResponse({ status: 'success', data });
    }

    function onError(err) {
        if (err.sendable === false) {
            throw new Error(err.message);
        }
        const errorData = {
            message: err.message
        };
        log.error(err, err.stack);
        return sendResponse({ status: 'error', data: errorData });
    }

    function sendResponse(responseBody) {
        const opts = {
            url: POST_RESULT_URL,
            json: true,
            forever: true,
            headers: {
                Connection: 'Keep-Alive'
            },
            rejectUnauthorized: false,
            body: responseBody,
            simple: false,
            maxAttempts: parseInt(env.ELASTICIO_API_REQUEST_RETRY_ATTEMPTS, 10),
            retryDelay: parseInt(env.ELASTICIO_API_REQUEST_RETRY_DELAY, 10),
            retryStrategy: request.RetryStrategies.HTTPOrNetworkError,
            fullResponse: true
        };

        debug('About to send response back to the API');

        return request.post(opts)
            .then(checkStatusCode)
            .then(() => responseBody);

        function checkStatusCode(response) {
            // eslint-disable-next-line eqeqeq
            if (response.statusCode != '200') {
                debug('Unable to reach API :(');

                const error = new Error(util.format(
                    'Failed to POST data to %s (%s, %s)',
                    POST_RESULT_URL, response.statusCode, response.body,
                ));
                error.sendable = false;
                throw error;
            }
        }
    }

    function verifyCredentials(cfg) { // , params
        function doVerification(verify) {
            return new Promise((resolve, reject) => {
                function legacyCallback(e, result) {
                    if (e) {
                        return reject(e);
                    }
                    return resolve(result);
                }
                const callScope = new ServiceExec({
                    logger: new ComponentLogger(),
                    services: {
                        apiClient,
                        config: env
                    }
                });

                const result = verify.call(callScope, cfg, legacyCallback);

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
        const callScope = new ServiceExec({
            logger: new ComponentLogger(),
            services: {
                apiClient,
                config: env
            }
        });
        // eslint-disable-next-line
    callScope.on('updateKeys', keys => addPromise(apiClient.accounts.update(cfg._account, { keys })));

        const finished = Q.defer();
        const subPromises = [];

        compReader.loadTriggerOrAction(triggerOrAction)
            .then(validateMethod)
            .then(executeMethod)
            .then(onExecutionSuccess)
            .catch(onExecutionFail)
            .done();

        function validateMethod(module) {
            const errorMsg = `Method "${method}" is not found in "${triggerOrAction}" action or trigger`;
            assert(_.isFunction(module[method]), errorMsg);
            return module;
        }

        function executeMethod(module) {
            return new Promise((resolve, reject) => {
                function legacyCallback(e, result) {
                    if (e) {
                        return reject(e);
                    }
                    return resolve(result);
                }
                const result = module[method].bind(callScope)(cfg, legacyCallback);

                if (result) {
                    resolve(result);
                }
            });
        }

        function onExecutionSuccess(data) {
            Q.allSettled(subPromises).then((res) => {
                _(res)
                    .filter({
                        state: 'rejected'
                    })
                    .map(result => result.reason)
                    .each(log.error.bind(log));
                finished.resolve(data);
            }).catch(err => log.error(err));
        }

        function onExecutionFail(err) {
            finished.reject(err);
        }

        function addPromise(p) {
            subPromises.push(p);
        }

        return finished.promise;
    }
}

exports.processService = processService;
