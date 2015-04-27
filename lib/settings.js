exports.MONGO_URI = process.env.MONGO_URI || fatalError('MONGO_URI is missing');
exports.AMQP_URI = process.env.AMQP_URI || fatalError('AMQP_URI is missing');
exports.COMPONENT_PATH = process.env.COMPONENT_PATH || '../';

exports.REBOUND_QUEUE_TTL = 10 * 60000; // 10 min
exports.REBOUND_INITIAL_EXPIRATION = process.env.REBOUND_INITIAL_EXPIRATION || 15000;

exports.EXCHANGE = {
    name: makeQueueName("exchange"),
    type: 'direct',
    routingKey: makeQueueName("routing"),
    options: {
        durable: true,
        autoDelete: false
    }
};

exports.INCOMING_MESSAGES_QUEUE = {
    name: process.env.INCOMING_MESSAGES_QUEUE || makeQueueName("imcoming"),
    options: {
        durable: true,
        autoDelete: false
    }
};

exports.OUTGOING_MESSAGES_QUEUE = {
    name: process.env.OUTGOING_MESSAGES_QUEUE || makeQueueName("outgoing"),
    options: {
        durable: true,
        autoDelete: false
    }
};

exports.ERRORS_QUEUE = {
    name: process.env.ERRORS_QUEUE || makeQueueName("errors"),
    options: {
        durable: true,
        autoDelete: false
    }
};

exports.REBOUNDS_QUEUE = {
    name: process.env.REBOUNDS_QUEUE || makeQueueName("rebounds"),
    options: {
        durable: true,
        autoDelete: false,
        arguments: {
            "x-message-ttl": exports.REBOUND_QUEUE_TTL,
            "x-dead-letter-exchange": exports.EXCHANGE.name,
            "x-dead-letter-routing-key": exports.EXCHANGE.routingKey
        }
    }
};

function makeQueueName(suffix) {
    if (!process.env.TASK_ID) fatalError('TASK_ID is missing');
    if (!process.env.STEP_ID) fatalError('STEP_ID is missing');
    return process.env.TASK_ID + ":" + process.env.STEP_ID + ":" + suffix;
}

function fatalError(text) {
    console.log(text);
    process.exit(1);
}





