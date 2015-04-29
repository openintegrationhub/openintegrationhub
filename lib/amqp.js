var debug = require('debug')('sailor');
var amqplib = require('amqplib');
var cipher = require('./cipher.js');
var Q = require('q');
var _ = require('lodash');

exports.AMQPConnection = AMQPConnection;

function AMQPConnection(settings) {

    var self = this;

    this.amqp = null;
    this.subscribeChannel = null;
    this.publishChannel = null;

    this.connect = function connect(uri) {
        return openConnection(uri)
            .then(openSubscribeChannel)
            .then(openPublishChannel)
            .then(assertAllQueues);
    };

    function openConnection(uri) {
        return amqplib.connect(uri).then(function assignConnection(connection) {
            debug('Connected to AMQP on %s', uri);
            self.amqp = connection;
        });
    }

    function openSubscribeChannel() {
        debug('Open subscribe channel');
        return self.amqp.createChannel().then(assignSubscribeChannel)
    }

    function assignSubscribeChannel(channel) {
        debug('Opened subscribe channel');
        self.subscribeChannel = channel;
    }

    function openPublishChannel() {
        debug('Open publish channel');
        return self.amqp.createChannel().then(assignPublishChannel);
    }

    function assignPublishChannel(channel) {
        debug('Opened publish channel');
        self.publishChannel = channel;
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
        return channel.assertQueue(queue.name, queue.options).then(function assertQueueSuccess() {
            debug('Succesfully asserted queue: ' + queue.name);
        });
    }

    function assertExchange(channel, exchange) {
        return channel.assertExchange(exchange.name, exchange.type, exchange.options).then(function assertExchangeSuccess() {
            debug('Succesfully asserted exchange: ' + exchange.name);
        });
    }

    this.listenQueue = function listenQueue(queueName, clientFunction) {
        return self.subscribeChannel.consume(queueName, function processMessage(message) {

            try {
                var decryptedContent = cipher.decryptMessageContent(message.content);
            } catch (err) {
                debug('Error occured while parsing message payload %s: %s', message.content, err.message);
                return self.ack(message, false);
            }

            try {
                clientFunction(decryptedContent, message);
            } catch (err) {
                debug('Failed to process message', message.content, err.message);
                return self.ack(message, false);
            }
        });
    };

    function sendEncrypted(queueName, messagePayload, options) {
        debug('Pushing to queue=%s, data=%j, options=%j', queueName, messagePayload, options);
        var encrypted = cipher.encryptMessageContent(messagePayload);
        self.publishChannel.sendToQueue(queueName, new Buffer(encrypted), options);
    }

    this.processData = function processData(data, originalMessage) {
        var headers = _.omit(originalMessage.properties.headers, 'x-death');
        var options = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: headers
        };
        sendEncrypted(settings.OUTGOING_MESSAGES_QUEUE.name, data, options);
    };

    this.processError = function processError(err, originalMessage) {
        var errorData = {
            message: err.message,
            stack: err.stack
        };
        var headers = _.omit(originalMessage.properties.headers, 'x-death');
        var options = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: headers
        };
        sendEncrypted(settings.ERRORS_QUEUE.name, errorData, options);
    };

    function cloneMessageOptions(msg) {
        delete msg.properties.headers['x-death'];
        var options = _.extend({}, msg.fields, msg.properties);
        return _.cloneDeep(options);  // to get real clone
    }

    function getNextReboundIteration(previousIteration) {
        if (previousIteration && typeof(previousIteration) === 'number') {
            return previousIteration + 1;
        }
        return 1;
    }

    function getNextReboundExpiration(iteration) {
        // retry in 15 sec, 30 sec, 1 min, 2 min, 4 min, 8 min, etc.
        return Math.pow(2, iteration - 1) * settings.REBOUND_INITIAL_EXPIRATION;
    }

    this.processRebound = function processRebound(reboundError, originalMessage) {

        var options = cloneMessageOptions(originalMessage);
        options.headers.reboundIteration = getNextReboundIteration(options.headers.reboundIteration);
        options.expiration = getNextReboundExpiration(options.headers.reboundIteration);

        if (options.expiration > settings.REBOUND_QUEUE_TTL) {
            debug('Message will be rebounded in ' + settings.REBOUND_QUEUE_TTL + ' msec');
        }

        debug('processRebound ' + options.headers.reboundIteration);

        if (options.headers.reboundIteration > settings.REBOUND_LIMIT) {
            self.processError(new Error('Rebound limit exceeded'), originalMessage);
        } else {
            self.publishChannel.sendToQueue(settings.REBOUNDS_QUEUE.name, originalMessage.content, options);
        }
    };

    this.ack = function ack(message, ack) {
        if (ack === false) {
            debug('Rejecting message: %j', message);
            self.subscribeChannel.reject(message, false);
        } else {
            debug('Acknowledging message: %j', message);
            self.subscribeChannel.ack(message);
        }
    };
}




