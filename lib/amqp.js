var debug = require('debug')('sailor');
var amqplib = require('amqplib');
var cipher = require('./cipher.js');
var Q = require('q');
var settings = require('./settings.js');

var AMQPConnection = function() {

    var self = this;

    self.amqp = null;
    self.subscribeChannel = null;
    self.publishChannel = null;

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
            return assertQueue(self.subscribeChannel, settings.INCOMING_MESSAGES_QUEUE);
        })
    };

    self.openPublishChannel = function openPublishChannel() {
        debug('Open publish channel');
        return self.amqp.createChannel().then(function(channel) {
            self.publishChannel = channel;
            debug('Opened publish channel');
            return Q.all([
                assertQueue(self.publishChannel, settings.OUTGOING_MESSAGES_QUEUE),
                assertQueue(self.publishChannel, settings.ERRORS_QUEUE),
                assertQueue(self.publishChannel, settings.REBOUNDS_QUEUE),
                assertExchange(self.publishChannel, settings.EXCHANGE)
            ]);
        });
    };

    self.listenQueue= function listenQueue(queueName, onMessage) {
        debug('Listen queue %s', queueName);
        return self.subscribeChannel.consume(queueName, function(msg) {
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

    self.sendToQueue = function sendToQueue(queueName, newMsg) {
        debug("Pushing to queue=%s, data=%j", queueName, newMsg);
        var encrypted = cipher.encrypt(JSON.stringify(newMsg.payload));
        self.publishChannel.sendToQueue(queueName, new Buffer(encrypted), {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: newMsg.headers
        });
    };

    self.rebound = function rebound(msg, reboundError) {
        var options = _.cloneDeep(_.extend({}, msg.fields, msg.properties));
        options.headers.reboundIteration = nextReboundIteration(options.headers.reboundIteration);
        options.expiration = nextReboundExpiration(options.headers.reboundIteration);
        if (options.expiration > settings.REBOUND_QUEUE_TTL) {
            debug('Message will be rebounded in ' + settings.REBOUND_QUEUE_TTL + ' msec');
        }
        self.sendToQueue(settings.REBOUNDS_QUEUE.name, msg.content, options);
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




