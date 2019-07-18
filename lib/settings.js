const _ = require('lodash');

exports.readFrom = readFrom;

function readFrom(envVars) {
    const result = {};

    // required settings
    const requiredAlways = [
        'FLOW_ID',
        'EXEC_ID',
        'STEP_ID',
        'CONTAINER_ID',
        'WORKSPACE_ID',

        'USER_ID',
        'COMP_ID',
        'FUNCTION',

        'API_URI',
        'API_USERNAME',
        'API_KEY'
    ];

    const requiredForMessageProcessing = [
        'AMQP_URI',
        'LISTEN_MESSAGES_ON',
        'PUBLISH_MESSAGES_TO',

        'DATA_ROUTING_KEY',
        'ERROR_ROUTING_KEY',
        'REBOUND_ROUTING_KEY',
        'SNAPSHOT_ROUTING_KEY'
    ];

    const optional = {
        REBOUND_INITIAL_EXPIRATION: 15000,
        REBOUND_LIMIT: 20,
        COMPONENT_PATH: '',
        RABBITMQ_PREFETCH_SAILOR: 1,
        STARTUP_REQUIRED: false,
        HOOK_SHUTDOWN: false,
        API_REQUEST_RETRY_ATTEMPTS: 3,
        API_REQUEST_RETRY_DELAY: 100,
        DATA_RATE_LIMIT: 10, // 10 data events every 100ms
        ERROR_RATE_LIMIT: 2, // 2 errors every 100ms
        SNAPSHOT_RATE_LIMIT: 2, // 2 Snapshots every 100ms
        RATE_INTERVAL: 100, // 100ms
        PROCESS_AMQP_DRAIN: true,
        AMQP_PUBLISH_RETRY_DELAY: 100, // 100ms
        AMQP_PUBLISH_RETRY_ATTEMPTS: 10
    };

    _.forEach(requiredAlways, function readRequired(key) {
        const envVarName = 'ELASTICIO_' + key;
        result[key] = envVars[envVarName] || throwError(envVarName + ' is missing');
    });

    if (!envVars.ELASTICIO_HOOK_SHUTDOWN) {
        _.forEach(requiredForMessageProcessing, function readRequired(key) {
            var envVarName = 'ELASTICIO_' + key;
            result[key] = envVars[envVarName] || throwError(envVarName + ' is missing');
        });
    }

    _.forEach(optional, function readOptional(defaultValue, key) {
        const envVarName = 'ELASTICIO_' + key;
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
