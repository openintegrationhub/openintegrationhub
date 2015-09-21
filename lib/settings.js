var logging = require('./logging.js');
var _ = require('lodash');

exports.readFrom = readFrom;

function readFrom(envVars) {

    var result = {};

    // required settings

    result.AMQP_URI = envVars.AMQP_URI || throwError('AMQP_URI is missing');

    result.LISTEN_MESSAGES_ON = envVars.LISTEN_MESSAGES_ON || throwError('LISTEN_MESSAGES_ON is missing');
    result.PUBLISH_MESSAGES_TO = envVars.PUBLISH_MESSAGES_TO || throwError('PUBLISH_MESSAGES_TO is missing');

    result.DATA_ROUTING_KEY = envVars.DATA_ROUTING_KEY || throwError('DATA_ROUTING_KEY is missing');
    result.ERROR_ROUTING_KEY = envVars.ERROR_ROUTING_KEY || throwError('ERROR_ROUTING_KEY is missing');
    result.REBOUND_ROUTING_KEY = envVars.REBOUND_ROUTING_KEY || throwError('REBOUND_ROUTING_KEY is missing');
    result.SNAPSHOT_ROUTING_KEY = envVars.SNAPSHOT_ROUTING_KEY || throwError('SNAPSHOT_ROUTING_KEY is missing');

    result.TASK = envVars.TASK ? JSON.parse(envVars.TASK) : throwError('TASK json is missing');
    result.STEP_ID = envVars.STEP_ID || throwError('STEP_ID is missing');

    result.API_URI = envVars.API_URI || throwError('API_URI is missing');
    result.API_USERNAME = envVars.API_USERNAME || throwError('API_USERNAME is missing');
    result.API_KEY = envVars.API_KEY || throwError('API_KEY is missing');

    // optional settings

    result.REBOUND_INITIAL_EXPIRATION = envVars.REBOUND_INITIAL_EXPIRATION || 15000;
    result.REBOUND_LIMIT = envVars.REBOUND_LIMIT || 20;
    result.COMPONENT_PATH = envVars.COMPONENT_PATH || '';

    function throwError(message) {
        throw new Error(message);
    }

    return result;
}




