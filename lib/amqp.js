var info = require('debug')('info');
var debug = require('debug')('debug');
var amqplib = require('amqplib');
var cipher = require('./cipher.js');
var Q = require('q');
var _ = require('lodash');
var errorReporter = require('./error_reporter.js');

exports.AMQPConnection = AMQPConnection;

function AMQPConnection(settings) {

    var self = this;

    this.amqp = null;
    this.subscribeChannel = null;
    this.publishChannel = null;

    this.connect = function connect(uri) {
        return openConnection(uri)
            .then(openSubscribeChannel)
            .then(openPublishChannel);
    };

    function openConnection(uri) {
        return amqplib.connect(uri).then(function onConnectionSuccess(connection) {
            info('Connected to AMQP');
            self.amqp = connection;
        });
    }

    function openSubscribeChannel() {
        return self.amqp.createChannel().then(onSubscribeChannelSuccess);
    }

    function onSubscribeChannelSuccess(channel) {
        info('Opened subscribe channel');
        self.subscribeChannel = channel;
        self.subscribeChannel.on('error', processChannelError);
    }

    function openPublishChannel() {
        return self.amqp.createChannel().then(onPublishChannelSuccess);
    }

    function onPublishChannelSuccess(channel) {
        info('Opened publish channel');
        self.publishChannel = channel;
        self.publishChannel.on('error', processChannelError);
    }

    function processChannelError(err) {
        errorReporter.reportError(err);
    }

    function processMessage(message, callback) {
        try {
            var decryptedContent = cipher.decryptMessageContent(message.content);
        } catch (err) {
            debug('Error occured while parsing message payload %s: %s', message.content, err.message);
            return self.ack(message, false);
        }

        try {
            callback(decryptedContent, message);
        } catch (err) {
            debug('Failed to process message', message.content, err.message);
            return self.ack(message, false);
        }
    }

    this.listenQueue = function listenQueue(queueName, clientFunction) {
        return self.subscribeChannel.consume(queueName, function onMessageReceived(message){
            processMessage(message, clientFunction);
        });
    };

    function sendDataToQueue(queueName, payload, options, encrypt) {
        debug('Pushing to queue=%s, data=%j, options=%j', queueName, payload, options);
        var content = encrypt ? cipher.encryptMessageContent(payload) : payload;
        try {
            self.publishChannel.sendToQueue(queueName, new Buffer(content), options);
        } catch (err) {
            debug('Failed to send message to queue %s, %s', queueName, err.message);
        }
    }

    this.processData = function processData(data, originalMessage) {
        var headers = _.omit(originalMessage.properties.headers, 'x-death');
        var options = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: headers
        };
        sendDataToQueue(settings.OUTGOING_MESSAGES_QUEUE, data, options, true);
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
        sendDataToQueue(settings.ERRORS_QUEUE, errorData, options, true);
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
        debug('Rebound message: %j', originalMessage);

        var options = cloneMessageOptions(originalMessage);
        options.headers.reboundIteration = getNextReboundIteration(options.headers.reboundIteration);
        options.expiration = getNextReboundExpiration(options.headers.reboundIteration);

        if (options.headers.reboundIteration > settings.REBOUND_LIMIT) {
            self.processError(new Error('Rebound limit exceeded'), originalMessage);
        } else {
            sendDataToQueue(settings.REBOUNDS_QUEUE, originalMessage.content, options, false);
        }
    };

    this.ack = function ack(message, ack) {
        if (ack === false) {
            info('Message #%j rejected', message.fields.deliveryTag);
            self.subscribeChannel.reject(message, false);
        } else {
            info('Message #%j ack', message.fields.deliveryTag);
            self.subscribeChannel.ack(message);
        }
    };

    this.disconnect = function disconnect(){
        debug('Close AMQP connections');
        try {
            self.subscribeChannel.close();
        } catch (alreadyClosed) {
            info('Subscribe channel is closed already');
        }
        try {
            self.publishChannel.close();
        } catch (alreadyClosed) {
            info('Publish channel is closed already');
        }
        try {
            self.amqp.close();
        } catch (alreadyClosed) {
            info('AMQP connection is closed already');
        }
        info('Successfully closed AMQP connections');
        return Q.resolve(true);
    };
}




