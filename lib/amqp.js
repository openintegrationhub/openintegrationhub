var debug = require('debug')('sailor');
var amqplib = require('amqplib');
var cipher = require('./cipher.js');
var Q = require('q');

exports.getIncomingMessagesQueueName = function(){
    return process.env.INCOMING_MESSAGES_QUEUE;
};

exports.getOutgoingMessagesQueueName = function(){
    return process.env.OUTGOING_MESSAGES_QUEUE;
};

exports.getErrorsQueueName = function(){
    return process.env.ERRORS_QUEUE;
};

exports.getReboundsQueueName = function(){
    return process.env.REBOUNDS_QUEUE;
};

function getExchangeName(){
    return process.env.INCOMING_MESSAGES_QUEUE + "-exchange";
}

function getRoutingKey(){
    return process.env.INCOMING_MESSAGES_QUEUE + "-routing";
}

var DIRECT_EXCHANGE_TYPE = 'direct';
var EXCHANGE_OPTIONS = {
    durable: true,
    autoDelete: false
};

var INCOMING_MESSAGE_QUEUE_OPTIONS =  {
    durable: true,
    autoDelete: false
};

var OUTGOING_MESSAGE_QUEUE_OPTIONS =  {
    durable: true,
    autoDelete: false
};

var ERROR_QUEUE_OPTIONS =  {
    durable: true,
    autoDelete: false
};

var REBOUND_QUEUE_TTL = 10 * 60000; // 10 min
var REBOUND_INITIAL_EXPIRATION = process.env.REBOUND_INITIAL_EXPIRATION || 15000;

var REBOUND_QUEUE_OPTIONS =  {
    durable: true,
    autoDelete: false,
    arguments: {
        "x-message-ttl": REBOUND_QUEUE_TTL,
        "x-dead-letter-exchange": getExchangeName(),
        "x-dead-letter-routing-key": getRoutingKey()
    }
};

var AMQPConnection = function() {

    var self = this;
    self.amqp = null;
    self.subscribeChannel = null;
    self.publishChannel = null;

    self.checkRequirements = function(){
        if (!process.env.AMQP_URI) return Q.reject('AMQP_URI is missing!');
    };

    self.connect = function connect(uri) {
        debug('Connected to AMQP on %s', uri);
        return amqplib.connect(uri).then(function(connection){
            self.amqp = connection;
        }).then(self.openSubscribeChannel)
          .then(self.openPublishChannel);
    };

    self.openSubscribeChannel = function openSubscribeChannel() {
        debug('Open subscribe channel');
        return self.amqp.createChannel().then(function(channel) {
            self.subscribeChannel = channel;
            debug('Opened subscribe channel');
            assertQueue(self.subscribeChannel, exports.getIncomingMessagesQueueName(), INCOMING_MESSAGE_QUEUE_OPTIONS);
        })
    };

    self.openPublishChannel = function openPublishChannel() {
        debug('Open publish channel');
        return self.amqp.createChannel().then(function(channel) {
            self.publishChannel = channel;
            debug('Opened publish channel');
            assertQueue(self.publishChannel, exports.getOutgoingMessagesQueueName(), OUTGOING_MESSAGE_QUEUE_OPTIONS);
            assertQueue(self.publishChannel, exports.getErrorsQueueName(), ERROR_QUEUE_OPTIONS);
            assertQueue(self.publishChannel, exports.getReboundsQueueName(), REBOUND_QUEUE_OPTIONS);
            assertExchange(self.publishChannel, getExchangeName(), EXCHANGE_OPTIONS)
        });
    };

    function assertQueue(channel, name, options) {
        debug('Assert queue %s', name);
        return channel.assertQueue(name, options);
    }

    function assertExchange(channel, name, options) {
        var exchangeOk = channel.assertExchange(name, DIRECT_EXCHANGE_TYPE, options);
        return exchangeOk.then(function() {
            debug('Succesfully asserted exchange: ' + name);
        });
    }

    self.listenQueue= function listenQueue(queueName, onMessage) {
        debug('Listen queue %s', queueName);
        self.subscribeChannel.consume(queueName, function(msg) {
            if (msg.content) {
                try {
                    msg.content = cipher.decrypt(msg.content.toString());
                    onMessage(msg);
                } catch (err) {
                    console.error('Error occured while parsing message payload.', err);
                    self.subscribeChannel.reject(msg, false);
                }
            }
        });
    };

    self.ack = function ack(message){
        console.log("Acknowledging message: %j", message);
        self.subscribeChannel.ack(message);
    };

    self.reject = function reject(message){
        console.log("Rejecting message: %j", message);
        self.subscribeChannel.reject(message);
    };

    self.rebound = function rebound(msg, reboundError) {

        function getReboundIteration(previousIteration) {
            if (previousIteration && typeof(previousIteration) == 'number') {
                return previousIteration + 1;
            }
            return 1;
        }

        function getReboundExpiration(iteration) {
            // retry in 15 sec, 30 sec, 1 min, 2 min, 4 min, 8 min, etc.
            return Math.pow(2, iteration-1) * REBOUND_INITIAL_EXPIRATION;
        }


        var options = _.cloneDeep(_.extend({}, msg.fields, msg.properties));
        options.headers.reboundIteration = getReboundIteration(options.headers.reboundIteration);
        options.expiration = getReboundExpiration(options.headers.reboundIteration);

        if (options.expiration > REBOUND_QUEUE_TTL) {
            debug('Message will be rebounded in ' + REBOUND_QUEUE_TTL + ' msec');
        }

        self.publishChannel.sendToQueue(exports.getReboundsQueueName(), msg.content, options);


    };

    self.pushMessage = function pushMessage(queueName, newMsg) {
        debug("Pushing to queue=%s, data=%j", queueName, newMsg);
        var encrypted = cipher.encrypt(JSON.stringify(newMsg.payload));
        self.publishChannel.sendToQueue(queueName, new Buffer(encrypted), {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: newMsg.headers
        });
    }
};


exports.AMQPConnection = AMQPConnection;




