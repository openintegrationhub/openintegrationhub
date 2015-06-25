var logging = require('./logging.js');
var info = logging.info;
var debug = logging.debug;
var amqplib = require('amqplib');
var cipher = require('./cipher.js');
var Q = require('q');
var _ = require('lodash');

exports.AMQPConnection = AMQPConnection;

function AMQPConnection(settings) {
    this.amqp = null;
    this.subscribeChannel = null;
    this.publishChannel = null;
    this.settings = settings;
}

AMQPConnection.prototype.connect = function connect(uri) {

    var self = this;

    return openConnection(uri)
        .then(openSubscribeChannel)
        .then(openPublishChannel);

    function openConnection(uri) {
        return amqplib.connect(uri).then(onConnectionSuccess);
    }

    function onConnectionSuccess(connection) {
        info('Connected to AMQP');
        self.amqp = connection;
    }

    function openSubscribeChannel() {
        return self.amqp.createChannel().then(onSubscribeChannelSuccess);
    }

    function onSubscribeChannelSuccess(channel) {
        info('Opened subscribe channel');
        self.subscribeChannel = channel;
        self.subscribeChannel.on('error', logging.criticalError);
    }

    function openPublishChannel() {
        return self.amqp.createChannel().then(onPublishChannelSuccess);
    }

    function onPublishChannelSuccess(channel) {
        info('Opened publish channel');
        self.publishChannel = channel;
        self.publishChannel.on('error', logging.criticalError);
    }
};

AMQPConnection.prototype.disconnect = function disconnect(){
    debug('Close AMQP connections');
    try {
        this.subscribeChannel.close();
    } catch (alreadyClosed) {
        info('Subscribe channel is closed already');
    }
    try {
        this.publishChannel.close();
    } catch (alreadyClosed) {
        info('Publish channel is closed already');
    }
    try {
        this.amqp.close();
    } catch (alreadyClosed) {
        info('AMQP connection is closed already');
    }
    info('Successfully closed AMQP connections');
    return Q.resolve(true);
};

AMQPConnection.prototype.listenQueue = function listenQueue(queueName, callback) {
    var self = this;

    return this.subscribeChannel.consume(queueName, function decryptMessage(message){
        debug('Message received: %j', message);

        if (message === null) {
            logging.info('NULL message received');
            return;
        }

        try {
            var decryptedContent = cipher.decryptMessageContent(message.content);
        } catch (err) {
            info('Error occured while parsing message #%j payload (%s)', message.fields.deliveryTag, err.message);
            return self.reject(message);
        }

        try {
            // pass to callback both derypted content & original message
            callback(decryptedContent, message);
        } catch (err) {
            info('Failed to process message #%j, reject', message.fields.deliveryTag);
            return self.reject(message);
        }
    });
};

AMQPConnection.prototype.ack = function ack(message) {
    info('Message #%j ack', message.fields.deliveryTag);
    this.subscribeChannel.ack(message);
};

AMQPConnection.prototype.reject = function reject(message) {
    info('Message #%j reject', message.fields.deliveryTag);
    return this.subscribeChannel.reject(message, false);
};

AMQPConnection.prototype.sendToExchange = function sendToExchange(exchangeName, routingKey, payload, options) {
    debug('Pushing to exchange=%s, routingKey=%s, data=%j, options=%j', exchangeName, routingKey, payload, options);
    try {
        this.publishChannel.publish(exchangeName, routingKey, new Buffer(payload), options);
    } catch (err) {
        debug('Failed to publish message to exchange %s, %s', exchangeName, err.message);
    }
};

AMQPConnection.prototype.sendData = function sendData(data, headers) {
    var settings = this.settings;
    var options = {
        contentType: 'application/json',
        contentEncoding: 'utf8',
        mandatory: true,
        headers: headers
    };
    var encryptedData = cipher.encryptMessageContent(data);
    this.sendToExchange(settings.PUBLISH_MESSAGES_TO, settings.DATA_ROUTING_KEY, encryptedData, options);
};

AMQPConnection.prototype.sendError = function sendError(err, headers, originalMessageContent) {
    var settings = this.settings;
    var options = {
        contentType: 'application/json',
        contentEncoding: 'utf8',
        mandatory: true,
        headers: headers
    };
    // make payload, error and errorInput are encoded
    var payload = {
        error: cipher.encryptMessageContent({
            name: err.name,
            message: err.message,
            stack: err.stack
        }),
        // originalMessageContent is encrypted
        errorInput: originalMessageContent.toString()
    };
    var errorPayload = JSON.stringify(payload);
    this.sendToExchange(settings.PUBLISH_MESSAGES_TO, settings.ERROR_ROUTING_KEY, errorPayload, options);
};

AMQPConnection.prototype.sendRebound = function sendRebound(reboundError, originalMessage, headers) {
    var settings = this.settings;

    debug('Rebound message: %j', originalMessage);
    var reboundIteration = getReboundIteration(originalMessage.properties.headers.reboundIteration);

    if (reboundIteration > settings.REBOUND_LIMIT) {
        return this.sendError(
            new Error('Rebound limit exceeded'),
            headers,
            originalMessage.content
        );
    } else {
        var options = {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            expiration: getExpiration(reboundIteration),
            headers: _.cloneDeep(headers)
        };

        options.headers.reboundIteration = reboundIteration;

        this.sendToExchange(
            settings.PUBLISH_MESSAGES_TO,
            settings.REBOUND_ROUTING_KEY,
            originalMessage.content,
            options
        );
    }

    function getReboundIteration(previousIteration) {
        if (previousIteration && typeof(previousIteration) === 'number') {
            return previousIteration + 1;
        }
        return 1;
    }

    // retry in 15 sec, 30 sec, 1 min, 2 min, 4 min, 8 min, etc.
    function getExpiration(iteration) {
        return Math.pow(2, iteration - 1) * settings.REBOUND_INITIAL_EXPIRATION;
    }
};






