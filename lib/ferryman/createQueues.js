var amqp = require('./lib/amqp.js');
var settings = require('./lib/settings.js').readFrom(process.env);
var Q = require('q');
var util = require('util');

var execId = "1432205514864";

var task = {
    "id" : "5559edd38968ec0736000003",
    "user" : "5527f0ea43238e5d5f000001",
    "data" : {
        "step_2" : {
            "_account" : "554b53aed5178d6540000001"
        },
        "step_3" : {
            "mapper" : {
                "data" : {
                    "qty" : "2"
                },
                "product" : "Btestsku"
            }
        },
        "step_1" : {
            "interval" : "minute",
            "_account" : "5559ed6b8968ec0736000002"
        }
    },
    "recipe" : {
        "nodes" : [
            {
                "first" : true,
                "id" : "step_1",
                "function" : "getProducts",
                "compId" : "shopware"
            },
            {
                "id" : "step_3",
                "function" : "map",
                "compId" : "mapper"
            },
            {
                "id" : "step_2",
                "function" : "updateInventory",
                "compId" : "magento"
            }
        ],
        "connections" : [
            {
                "to" : "step_3",
                "from" : "step_1"
            },
            {
                "to" : "step_2",
                "from" : "step_3"
            }
        ]
    }
};


var amqpConnection = new amqp.AMQPConnection(settings);
amqpConnection.connect(settings.AMQP_URI).then(function(){
    сreateQueuesAndExchanges(execId, task, "step_1", "step_2");
});

function сreateQueuesAndExchanges(execId, task, stepId, nextStepId){

    var EXCHANGE_NAME = 'userexchange:' + task.user;

    var MESSAGE_TAG = util.format('%s:%s:%s:message', task.id, stepId, execId);
    var ERROR_TAG = util.format('%s:%s:%s:error', task.id, stepId, execId);
    var REBOUND_TAG = util.format('%s:%s:%s:rebound', task.id, stepId, execId);

    var MESSAGES_QUEUE = util.format('%s:%s:%s:messages', task.id, stepId, execId);
    var MESSAGES_LISTENING_QUEUE = util.format('%s:%s:%s:messages', task.id, nextStepId, execId);
    var REBOUNDS_QUEUE = util.format('%s:%s:%s:rebounds', task.id, stepId, execId);

    console.log('INCOMING_MESSAGES_QUEUE=%s', MESSAGES_QUEUE);
    console.log('EXCHANGE_NAME=%s', EXCHANGE_NAME);
    console.log('MESSAGE_TAG=%s', MESSAGE_TAG);
    console.log('ERROR_TAG=%s', ERROR_TAG);
    console.log('REBOUND_TAG=%s', REBOUND_TAG);
    console.log('MESSAGES_QUEUE=%s', MESSAGES_QUEUE);
    console.log('REBOUNDS_QUEUE=%s', REBOUNDS_QUEUE);

    var userExchange = {
        name: EXCHANGE_NAME,
        type: 'direct',
        options: {
            durable: true,
            autoDelete: false
        }
    };

    var messagesQueue = {
        name: MESSAGES_QUEUE,
        options: {
            durable: true,
            autoDelete: false
        }
    };

    var messagesListeningQueue = {
        name: MESSAGES_LISTENING_QUEUE,
        options: {
            durable: true,
            autoDelete: false
        }
    };

    const REBOUND_QUEUE_TTL_STRING = process.env.REBOUND_QUEUE_TTL;
    var REBOUND_QUEUE_TTL = REBOUND_QUEUE_TTL_STRING && REBOUND_QUEUE_TTL_STRING.length > 0 ? 
        parseInt(REBOUND_QUEUE_TTL_STRING) : (10 * 60 * 1000); // 10 min

    var reboundsQueue = {
        name: REBOUNDS_QUEUE,
        options: {
            durable: true,
            autoDelete: false,
            arguments: {
                'x-message-ttl': REBOUND_QUEUE_TTL,
                'x-dead-letter-exchange': EXCHANGE_NAME, // send dead rebounded queues back to exchange
                'x-dead-letter-routing-key': MESSAGE_TAG // with tag as message
            }
        }
    };

    return Q.all([
        assertExchange(amqpConnection.publishChannel, userExchange), // check that exchange exists
        assertQueue(amqpConnection.publishChannel, messagesQueue), // create messages queue
        assertQueue(amqpConnection.publishChannel, messagesListeningQueue), // create messages queue
        amqpConnection.publishChannel.bindQueue(messagesListeningQueue.name, userExchange.name, MESSAGE_TAG),
        assertQueue(amqpConnection.publishChannel, reboundsQueue), // create rebounds queue
        amqpConnection.publishChannel.bindQueue(reboundsQueue.name, userExchange.name, REBOUND_TAG)
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
}