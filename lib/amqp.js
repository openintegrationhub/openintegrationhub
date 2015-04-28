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

    var defaultMessageOptions = {
        contentType: 'application/json',
        contentEncoding: 'utf8',
        mandatory: true
    };

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

    function sendToQueue(queueName, messagePayload, providedOptions) {
        debug("Pushing to queue=%s, data=%j, options=%j", queueName, messagePayload, options);
        var encrypted = cipher.encrypt(JSON.stringify(messagePayload));
        var options = providedOptions || defaultMessageOptions;
        self.publishChannel.sendToQueue(queueName, new Buffer(encrypted), options);
    }

    self.listenQueue = function listenQueue(queueName, callback){
        return self.subscribeChannel.consume(queueName, function processMessage(message) {
            console.log('processMessage');
            Q.nfcall(decryptMessage, message).then(function(decryptedMessage) {
                callback(message, decryptedMessage);
            }).fail(function(err) {
                self.ack(message, false);
            }).done();
        });
    };

    function decryptMessage(message, callback) {
        console.log('decryptMessage');
        if (message.content) {
            try {
                message.content = cipher.decrypt(message.content.toString());
                message.content = JSON.parse(message.content);
                callback(null, message);
            } catch (err) {
                callback(new Error('Error occured while parsing message payload %s: %s', message.content, err.message));
            }
        } else {
            callback(new Error('Message with empty content received'));
        }
    }

    self.processData = function processData(data){
        sendToQueue(settings.OUTGOING_MESSAGES_QUEUE.name, data);
    };

    self.processError = function processError(err){
        var errorData = {
            message: err.message,
            stack: err.stack
        };
        sendToQueue(settings.ERRORS_QUEUE.name, errorData);
    };

    self.processRebound = function processRebound(message, reboundError){

        var options = _.cloneDeep(_.extend({}, message.fields, message.properties));

        options.headers.reboundIteration = nextReboundIteration(options.headers.reboundIteration);
        options.expiration = nextReboundExpiration(options.headers.reboundIteration);

        if (options.expiration > settings.REBOUND_QUEUE_TTL) {
            debug('Message will be rebounded in ' + settings.REBOUND_QUEUE_TTL + ' msec');
        }
        if (options.headers.reboundIteration > settings.REBOUND_LIMIT) {
            processError(new Error('Rebound limit exceeded'));
        } else {
            sendToQueue(settings.REBOUNDS_QUEUE.name, message.content, options);
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

    self.ack = function ack(message, ack) {
        if (ack === false) {
            console.log("Rejecting message: %j", message);
            self.subscribeChannel.reject(message, false);
        } else {
            console.log("Acknowledging message: %j", message);
            self.subscribeChannel.ack(message);
        }
    }

};

exports.AMQPConnection = AMQPConnection;




