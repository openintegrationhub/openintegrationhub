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

        'TASK',
        'STEP_ID',

        'API_URI',
        'API_USERNAME',
        'API_KEY'
    ];

    var optional = {
        REBOUND_INITIAL_EXPIRATION: 15000,
        REBOUND_LIMIT: 20,
        COMPONENT_PATH: '',
        RABBITMQ_PREFETCH_SAILOR: 1
    };

    _.forEach(required, function readRequired(key) {
        var envVarName = 'ELASTICIO_' + key;
        result[key] = envVars[envVarName] || throwError(envVarName + ' is missing');
    });

    _.forEach(optional, function readOptional(defaultValue, key) {
        var envVarName = 'ELASTICIO_' + key;
        result[key] = envVars[envVarName] || defaultValue;
    });

    result.TASK = JSON.parse(result.TASK);

    function throwError(message) {
        throw new Error(message);
    }

    return result;
}
