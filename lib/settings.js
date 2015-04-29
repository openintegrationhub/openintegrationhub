exports.readFrom = readFrom;

function readFrom(envVars) {

    var result = {};

    result.MONGO_URI = envVars.MONGO_URI || throwError('MONGO_URI is missing');
    result.AMQP_URI = envVars.AMQP_URI || throwError('AMQP_URI is missing');
    result.COMPONENT_PATH = envVars.COMPONENT_PATH || '';

    result.REBOUND_QUEUE_TTL = 10 * 60 * 1000; // 10 min
    result.REBOUND_INITIAL_EXPIRATION = envVars.REBOUND_INITIAL_EXPIRATION || 15000;
    result.REBOUND_LIMIT = envVars.REBOUND_LIMIT || 2;

    result.INCOMING_MESSAGES_QUEUE = {
        name: envVars.INCOMING_MESSAGES_QUEUE || makeQueueName("incoming"),
        options: {
            durable: true,
            autoDelete: false
        }
    };

    result.OUTGOING_MESSAGES_QUEUE = {
        name: envVars.OUTGOING_MESSAGES_QUEUE || makeQueueName("outgoing"),
        options: {
            durable: true,
            autoDelete: false
        }
    };

    result.ERRORS_QUEUE = {
        name: envVars.ERRORS_QUEUE || makeQueueName("errors"),
        options: {
            durable: true,
            autoDelete: false
        }
    };

    result.REBOUNDS_EXCHANGE = {
        name: envVars.REBOUNDS_EXCHANGE || makeQueueName("rebounds_exchange"),
        type: 'direct',
        routingKey: envVars.REBOUNDS_ROUTING_KEY || makeQueueName("rebounds_routing_key"),
        options: {
            durable: true,
            autoDelete: false
        }
    };

    result.REBOUNDS_QUEUE = {
        name: envVars.REBOUNDS_QUEUE || makeQueueName("rebounds"),
        options: {
            durable: true,
            autoDelete: false,
            arguments: {
                "x-message-ttl": result.REBOUND_QUEUE_TTL,
                "x-dead-letter-exchange": result.REBOUNDS_EXCHANGE.name,
                "x-dead-letter-routing-key": result.REBOUNDS_EXCHANGE.routingKey
            }
        }
    };

    function makeQueueName(suffix) {
        if (!envVars.TASK_ID) throwError('TASK_ID is missing');
        if (!envVars.STEP_ID) throwError('STEP_ID is missing');
        return envVars.TASK_ID + ":" + envVars.STEP_ID + ":" + suffix;
    }

    function throwError(message) {
        throw new Error(message);
    }

    return result;
}




