var debug = require('debug')('sailor');
var amqplib = require('amqplib');
var cipher = require('./cipher.js');
var Q = require('q');
var settings = require('./settings.js');
var _ = require('lodash');

var AMQPConnection = function() {

    var self = this;

    self.amqp = null;
    self.subscribeChannel = null;
    self.publishChannel = null;

    self.connect = function connect(uri) {
        return openConnection(uri)
            .then(openSubscribeChannel)
            .then(openPublishChannel)
            .then(assertAllQueues);
    };

    function openConnection(uri) {
        return amqplib.connect(uri).then(function(connection){
            debug('Connected to AMQP on %s', uri);
            self.amqp = connection;
        });
    }

    function openSubscribeChannel() {
        debug('Open subscribe channel');
        return self.amqp.createChannel().then(function(channel) {
            debug('Opened subscribe channel');
            self.subscribeChannel = channel;
        })
    }

    function openPublishChannel() {
        debug('Open publish channel');
        return self.amqp.createChannel().then(function(channel) {
            debug('Opened publish channel');
            self.publishChannel = channel;
        });
    }

    function assertAllQueues() {
        return Q.all([
            assertQueue(self.subscribeChannel, settings.INCOMING_MESSAGES_QUEUE),
            assertQueue(self.publishChannel, settings.OUTGOING_MESSAGES_QUEUE),
            assertQueue(self.publishChannel, settings.ERRORS_QUEUE),
            assertQueue(self.publishChannel, settings.REBOUNDS_QUEUE),
            assertExchange(self.publishChannel, settings.REBOUNDS_EXCHANGE),
            self.publishChannel.bindQueue(settings.INCOMING_MESSAGES_QUEUE.name, settings.REBOUNDS_EXCHANGE.name, settings.REBOUNDS_EXCHANGE.routingKey)
        ]);
    }

    self.listenQueue= function listenQueue(queueName, callback) {

        debug('Listen queue %s', queueName);

        return self.subscribeChannel.consume(queueName, function processMessage(message) {

            var ack = getAckFunction(self.subscribeChannel, message);
            var rebound = getReboundFunction(message);

            if (!message.content) {
                console.error('Message with empty content received');
                ack(false);
                return;
            }

            try {
                message.content = cipher.decrypt(message.content.toString());
                message.content = JSON.parse(message.content);
            } catch (err) {
                console.error('Error occured while parsing message payload %s: %s', message.content, err.message);
                ack(true);
                return;
            }

            try {
                callback(message, ack, rebound);
            } catch (err) {
                console.error('Error occured while processing message', message.content, err.message);
                ack(true);
            }
        });
    };

    function getAckFunction(channel, message){
        return _.once(function ackOnce(ack) {
            if (ack) {
                console.log("Acknowledging message: %j", message);
                channel.ack(message);
            } else {
                console.log("Rejecting message: %j", message);
                channel.reject(message, false);
            }
        });
    }

    function getReboundFunction(message){
        return function reboundCallback(reboundError) {
            var options = _.cloneDeep(_.extend({}, message.fields, message.properties));
            options.headers.reboundIteration = nextReboundIteration(options.headers.reboundIteration);
            options.expiration = nextReboundExpiration(options.headers.reboundIteration);
            if (options.expiration > settings.REBOUND_QUEUE_TTL) {
                debug('Message will be rebounded in ' + settings.REBOUND_QUEUE_TTL + ' msec');
            }
            if (options.headers.reboundIteration > settings.REBOUND_LIMIT) {
                self.sendToQueue(settings.ERRORS_QUEUE.name, {"message": "Rebound limit exceeded"});
            } else {
                self.sendToQueue(settings.REBOUNDS_QUEUE.name, message.content, options);
            }
        }
    }


    self.sendToQueue= function sendToQueue(queueName, messagePayload, options) {
        var encrypted = cipher.encrypt(JSON.stringify(messagePayload));
        if (!options) {
            var options = {
                contentType: 'application/json',
                contentEncoding: 'utf8',
                mandatory: true
            }
        }
        debug("Pushing to queue=%s, data=%j, options=%j", queueName, messagePayload, options);
        self.publishChannel.sendToQueue(queueName, new Buffer(encrypted), options);
    };

    function assertQueue(channel, queue) {
        return channel.assertQueue(queue.name, queue.options).then(function() {
            debug('Succesfully asserted queue: ' + queue.name);
        });
    }

    function assertExchange(channel, exchange) {
        return channel.assertExchange(exchange.name, exchange.type, exchange.options).then(function() {
            debug('Succesfully asserted exchange: ' + exchange.name);
        });
    }

    function nextReboundIteration(previousIteration) {
        if (previousIteration && typeof(previousIteration) == 'number') {
            return previousIteration + 1;
        }
        return 1;
    }

    function nextReboundExpiration(iteration) {
        // retry in 15 sec, 30 sec, 1 min, 2 min, 4 min, 8 min, etc.
        return Math.pow(2, iteration-1) * settings.REBOUND_INITIAL_EXPIRATION;
    }
};


exports.AMQPConnection = AMQPConnection;




