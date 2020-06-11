const _ = require('lodash');


const PREFIX = 'ELASTICIO_';

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
        'BACK_CHANNEL',

        'DATA_ROUTING_KEY',
        'ERROR_ROUTING_KEY',
        'REBOUND_ROUTING_KEY',
        'SNAPSHOT_ROUTING_KEY'
    ];

    const optional = {
        SNAPSHOTS_SERVICE_BASE_URL: 'https://localhost:2345',
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
        AMQP_PUBLISH_RETRY_ATTEMPTS: Infinity,
        AMQP_PUBLISH_MAX_RETRY_DELAY: 5 * 60 * 1000, // 5 mins
        OUTGOING_MESSAGE_SIZE_LIMIT: 10485760,
        NO_SELF_PASSTRHOUGH: false,
        PROTOCOL_VERSION: 1
    };

    if (envVars.ELASTICIO_ADDITIONAL_VARS_FOR_HEADERS) {
        const vars = {};
        envVars.ELASTICIO_ADDITIONAL_VARS_FOR_HEADERS
            .split(',')
            .map(env => env.trim())
            .forEach(env => {
                const key = env.indexOf(PREFIX) === 0 ? env.slice(PREFIX.length) : env;
                vars[key] = envVars[env];
            });
        result.additionalVars = vars;
    }
    const envVarsList = requiredAlways.slice(0);

    if (!envVars.ELASTICIO_HOOK_SHUTDOWN) {
        envVarsList.push(...requiredForMessageProcessing);
    }

    envVarsList.forEach(key => {
        const envVarName = PREFIX + key;
        if (!envVars[envVarName]) {
            throw new Error(`${envVarName} is missing`);
        }
        result[key] = envVars[envVarName];
    });

    _.forEach(optional, function readOptional(defaultValue, key) {
        const envVarName = PREFIX + key;
        if (typeof defaultValue === 'number' && envVars[envVarName]) {
            result[key] = parseInt(envVars[envVarName]) || defaultValue;
        } else {
            result[key] = envVars[envVarName] || defaultValue;
        }
    });

    return result;
}

exports.readFrom = readFrom;
