const _ = require('lodash');


const PREFIX = 'ELASTICIO_';

function readFrom(envVars) {
    const result = {};

    // required settings
    const requiredAlways = [
    // 'FLOW_ID',
    // 'EXEC_ID',
    // 'STEP_ID',

        // 'USER_ID',
        'COMP_ID',
        // 'FUNCTION',

        'API_URI'
    // 'API_USERNAME',
    // 'API_KEY',
    ];

    const requiredForOldSailor = [
        'FLOW_ID',
        'EXEC_ID',
        'STEP_ID',
        'USER_ID',
        'API_USERNAME',
        'API_KEY',
        'FUNCTION',
        'SNAPSHOT_ROUTING_KEY'
    ];

    const requiredForMessageProcessing = [
        'AMQP_URI',
        'LISTEN_MESSAGES_ON',
        // 'PUBLISH_MESSAGES_TO',
        'BACKCHANNEL_EXCHANGE',
        'NODE_EXCHANGE',
        'OUTPUT_ROUTING_KEY',
        // 'ERROR_ROUTING_KEY',
        'REBOUND_ROUTING_KEY'
    // 'SNAPSHOT_ROUTING_KEY',
    ];

    const optional = {
        ERROR_ROUTING_KEY: null,
        SECRET_SERVICE_BASE_URL: 'http://secret-service.oih.svc.cluster.local:3000/api/v1',
        GOVERNANCE_SERVICE_BASE_URL: 'http://governance-service.oih-dev-ns.svc.cluster.local:3009',
        GOVERNANCE_ROUTING_KEY: 'provenance',
        EVENT_BUS_EXCHANGE: 'event-bus',
        RDS_ROUTING_KEY: 'raw-record.created',
        SNAPSHOTS_SERVICE_BASE_URL: 'https://localhost:2345',
        DATAHUB_BASE_URL: process.env.NODE_ENV === 'test'
            ? false : 'http://data-hub-service.oih-dev-ns.svc.cluster.local:1234',
        SNAPSHOTS_EXCHANGE: 'component-events-collector',
        REBOUND_INITIAL_EXPIRATION: 15000,
        REBOUND_LIMIT: 20,
        COMPONENT_PATH: '',
        RABBITMQ_PREFETCH_SAILOR: 1,
        STARTUP_REQUIRED: false,
        HOOK_SHUTDOWN: false,
        API_REQUEST_RETRY_ATTEMPTS: 3,
        API_REQUEST_RETRY_DELAY: 100,
        OUTPUT_RATE_LIMIT: 10, // 10 data events every 100ms
        ERROR_RATE_LIMIT: 2, // 2 errors every 100ms
        SNAPSHOT_RATE_LIMIT: 2, // 2 Snapshots every 100ms
        RATE_INTERVAL: 100, // 100ms
        PROCESS_AMQP_DRAIN: true,
        AMQP_PUBLISH_RETRY_DELAY: 100, // 100ms
        AMQP_PUBLISH_RETRY_ATTEMPTS: Infinity,
        AMQP_PUBLISH_MAX_RETRY_DELAY: 5 * 60 * 1000, // 5 mins
        AMQP_CONNECT_RETRY_DELAY: 2000, // ms
        AMQP_CONNECT_RETRY_LIMIT: 150, // count
        OUTGOING_MESSAGE_SIZE_LIMIT: 10485760,
        NO_SELF_PASSTRHOUGH: false,
        PROTOCOL_VERSION: 1,

        CONTAINER_ID: 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948',
        WORKSPACE_ID: '5559edd38968ec073600683'

    };

    if (envVars.ELASTICIO_ADDITIONAL_VARS_FOR_HEADERS) {
        const vars = {};
        envVars.ELASTICIO_ADDITIONAL_VARS_FOR_HEADERS
            .split(',')
            .map(env => env.trim())
            .forEach((env) => {
                const key = env.indexOf(PREFIX) === 0 ? env.slice(PREFIX.length) : env;
                vars[key] = envVars[env];
            });
        result.additionalVars = vars;
    }
    const envVarsList = requiredAlways.slice(0);

    if (!envVars.ELASTICIO_HOOK_SHUTDOWN) {
        envVarsList.push(...requiredForMessageProcessing);
    }

    envVarsList.forEach((key) => {
        const envVarName = PREFIX + key;
        if (!envVars[envVarName]) {
            throw new Error(`${envVarName} is missing`);
        }
        result[key] = envVars[envVarName];
    });

    const oldSailorList = requiredForOldSailor.slice(0);

    oldSailorList.forEach((key) => {
        const envVarName = PREFIX + key;
        if (envVars[envVarName]) {
            result[key] = envVars[envVarName];
        }
    });

    _.forEach(optional, (defaultValue, key) => {
        const envVarName = PREFIX + key;
        if (typeof defaultValue === 'number' && envVars[envVarName]) {
            result[key] = parseInt(envVars[envVarName], 10) || defaultValue;
        } else {
            result[key] = envVars[envVarName] || defaultValue;
        }
    });

    return result;
}

exports.readFrom = readFrom;
