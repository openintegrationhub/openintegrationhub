exports.readFrom = readFrom;

function readFrom(envVars) {

    var result = {};

    result.MONGO_URI = envVars.MONGO_URI || throwError('MONGO_URI is missing');
    result.AMQP_URI = envVars.AMQP_URI || throwError('AMQP_URI is missing');
    result.COMPONENT_PATH = envVars.COMPONENT_PATH || '';

    result.INCOMING_MESSAGES_QUEUE = envVars.INCOMING_MESSAGES_QUEUE || makeQueueName('incoming');
    result.OUTGOING_MESSAGES_QUEUE = envVars.OUTGOING_MESSAGES_QUEUE || makeQueueName('outgoing');
    result.ERRORS_QUEUE = envVars.ERRORS_QUEUE || makeQueueName('errors');

    result.REBOUNDS_QUEUE = envVars.REBOUNDS_QUEUE || makeQueueName('rebounds');
    result.REBOUND_INITIAL_EXPIRATION = envVars.REBOUND_INITIAL_EXPIRATION || 15000;
    result.REBOUND_LIMIT = envVars.REBOUND_LIMIT || 2;

    function makeQueueName(suffix) {
        if (!envVars.TASK_ID) throwError('TASK_ID is missing');
        if (!envVars.STEP_ID) throwError('STEP_ID is missing');
        return envVars.TASK_ID + ':' + envVars.STEP_ID + ':' + suffix;
    }

    function throwError(message) {
        throw new Error(message);
    }

    return result;
}




