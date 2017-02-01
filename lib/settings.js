var _ = require('lodash');

exports.readFrom = readFrom;

function readFrom(envVars) {

    var result = {};

    // required settings

    var required = [
        'AMQP_URI',
        'LISTEN_MESSAGES_ON',
        'PUBLISH_MESSAGES_TO',

        'DATA_ROUTING_KEY',
        'ERROR_ROUTING_KEY',
        'REBOUND_ROUTING_KEY',
        'SNAPSHOT_ROUTING_KEY',

        'FLOW_ID',
        'EXEC_ID',
        'STEP_ID',

        'USER_ID',
        'COMP_ID',
        'FUNCTION',

        'API_URI',
        'API_USERNAME',
        'API_KEY'
    ];

    var optional = {
        REBOUND_INITIAL_EXPIRATION: 15000,
        REBOUND_LIMIT: 20,
        COMPONENT_PATH: '',
        RABBITMQ_PREFETCH_SAILOR: 1,
        STARTUP_REQUIRED: false
    };

    _.forEach(required, function readRequired(key) {
        var envVarName = 'ELASTICIO_' + key;
        result[key] = envVars[envVarName] || throwError(envVarName + ' is missing');
    });

    _.forEach(optional, function readOptional(defaultValue, key) {
        var envVarName = 'ELASTICIO_' + key;
        if (typeof defaultValue === 'number' && envVars[envVarName]) {
            result[key] = parseInt(envVars[envVarName]) || defaultValue;
        } else {
            result[key] = envVars[envVarName] || defaultValue;
        }
    });

    function throwError(message) {
        throw new Error(message);
    }

    return result;
}
