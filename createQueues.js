var amqp = require('./lib/amqp.js');
var settings = require('./lib/settings.js').readFrom(process.env);
var Q = require('q');

var amqpConnection = new amqp.AMQPConnection(settings);
amqpConnection.connect(settings.AMQP_URI).then(сreateQueuesAndExchanges);

function сreateQueuesAndExchanges(){


    var INCOMING_MESSAGES_QUEUE = {
        name: settings.INCOMING_MESSAGES_QUEUE,
        options: {
            durable: true,
            autoDelete: false
        }
    };

    var OUTGOING_MESSAGES_QUEUE = {
        name: settings.OUTGOING_MESSAGES_QUEUE,
        options: {
            durable: true,
            autoDelete: false
        }
    };

    var ERRORS_QUEUE = {
        name: settings.ERRORS_QUEUE,
        options: {
            durable: true,
            autoDelete: false
        }
    };

    var REBOUNDS_EXCHANGE = {
        name: process.env.REBOUNDS_EXCHANGE || makeQueueName('rebounds_exchange'),
        type: 'direct',
        routingKey: process.env.REBOUNDS_ROUTING_KEY || makeQueueName('rebounds_routing_key'),
        options: {
            durable: true,
            autoDelete: false
        }
    };

    var REBOUND_QUEUE_TTL = 10 * 60 * 1000; // 10 min

    var REBOUNDS_QUEUE = {
        name: settings.REBOUNDS_QUEUE,
        options: {
            durable: true,
            autoDelete: false,
            arguments: {
                'x-message-ttl': REBOUND_QUEUE_TTL,
                'x-dead-letter-exchange': REBOUNDS_EXCHANGE.name,
                'x-dead-letter-routing-key': REBOUNDS_EXCHANGE.routingKey
            }
        }
    };

    return Q.all([
        assertQueue(amqpConnection.subscribeChannel, INCOMING_MESSAGES_QUEUE),
        assertQueue(amqpConnection.publishChannel, OUTGOING_MESSAGES_QUEUE),
        assertQueue(amqpConnection.publishChannel, ERRORS_QUEUE),
        assertQueue(amqpConnection.publishChannel, REBOUNDS_QUEUE),
        assertExchange(amqpConnection.publishChannel, REBOUNDS_EXCHANGE),
        amqpConnection.publishChannel.bindQueue(INCOMING_MESSAGES_QUEUE.name, REBOUNDS_EXCHANGE.name, REBOUNDS_EXCHANGE.routingKey)
    ]).then(function(){
        console.log('Successfully asserted all queues');
    }).done();

    function assertQueue(channel, queue) {
        return channel.assertQueue(queue.name, queue.options).then(function assertQueueSuccess() {
            console.log('Succesfully asserted queue: ' + queue.name);
        });
    }

    function assertExchange(channel, exchange) {
        return channel.assertExchange(exchange.name, exchange.type, exchange.options).then(function assertExchangeSuccess() {
            console.log('Succesfully asserted exchange: ' + exchange.name);
        });
    }

    function makeQueueName(suffix) {
        if (!process.env.TASK_ID) throwError('TASK_ID is missing');
        if (!process.env.STEP_ID) throwError('STEP_ID is missing');
        return process.env.TASK_ID + ':' + process.env.STEP_ID + ':' + suffix;
    }

    function throwError(message) {
        throw new Error(message);
    }
}