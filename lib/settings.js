var logging = require('./logging.js');
var _ = require('lodash');

exports.readFrom = readFrom;

function readFrom(envVars) {

    var result = {};

    // required settings

    result.MONGO_URI = envVars.MONGO_URI || throwError('MONGO_URI is missing');
    result.AMQP_URI = envVars.AMQP_URI || throwError('AMQP_URI is missing');

    result.LISTEN_MESSAGES_ON = envVars.LISTEN_MESSAGES_ON || throwError('LISTEN_MESSAGES_ON is missing');
    result.PUBLISH_MESSAGES_TO = envVars.PUBLISH_MESSAGES_TO || throwError('PUBLISH_MESSAGES_TO is missing');

    result.DATA_ROUTING_KEY = envVars.DATA_ROUTING_KEY || throwError('DATA_ROUTING_KEY is missing');
    result.ERROR_ROUTING_KEY = envVars.ERROR_ROUTING_KEY || throwError('ERROR_ROUTING_KEY is missing');
    result.REBOUND_ROUTING_KEY = envVars.REBOUND_ROUTING_KEY || throwError('REBOUND_ROUTING_KEY is missing');

    result.TASK = envVars.TASK ? JSON.parse(envVars.TASK) : throwError('TASK json is missing');
    result.STEP_ID = envVars.STEP_ID || throwError('STEP_ID is missing');

    // optional settings

    result.REBOUND_INITIAL_EXPIRATION = envVars.REBOUND_INITIAL_EXPIRATION || 15000;
    result.REBOUND_LIMIT = envVars.REBOUND_LIMIT || 2;
    result.COMPONENT_PATH = envVars.COMPONENT_PATH || '';

    // log to console
    _.forOwn(result, function(value, key) {
        logging.info(key + '=' + JSON.stringify(value));
    });


    function throwError(message) {
        throw new Error(message);
    }

    return result;
}




