const logging = require('./logging.js');
const info = logging.info;
const debug = logging.debug;
const amqplib = require('amqplib');
const encryptor = require('./encryptor.js');
const Q = require('q');
const _ = require('lodash');

const HEADER_ROUTING_KEY = 'x-eio-routing-key';
const HEADER_ERROR_RESPONSE = 'x-eio-error-response';

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

AMQPConnection.prototype.disconnect = function disconnect() {
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

    this.subscribeChannel.prefetch(this.settings.RABBITMQ_PREFETCH_SAILOR);

    return this.subscribeChannel.consume(queueName, function decryptMessage(message) {
        debug('Message received: %j', message);

        if (message === null) {
            logging.info('NULL message received');
            return;
        }

        try {
            var decryptedContent = encryptor.decryptMessageContent(message.content, message.properties.headers);
        } catch (err) {
            console.error(
                'Error occured while parsing message #%j payload (%s)',
                message.fields.deliveryTag,
                err.message
            );
            return self.reject(message);
        }

        copyAmqpHeadersToMessage(message, decryptedContent);

        try {
            // pass to callback both decrypted content & original message
            callback(decryptedContent, message);
        } catch (err) {
            console.error('Failed to process message #%j, reject', message.fields.deliveryTag);
            return self.reject(message);
        }
    });
};

function copyAmqpHeadersToMessage(amqpMsg, msg) {
    var source = amqpMsg.properties.headers;

    if (!msg.headers) {
        msg.headers = {};
    }

    if (source.reply_to) {
        msg.headers.reply_to = source.reply_to;
    }
}

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

AMQPConnection.prototype.prepareMessageAndSendToExchange
    = function prepareMessageAndSendToExchange(data, headers, routingKey) {
    const settings = this.settings;
    const options = getOptions(headers);
    const encryptedData = encryptor.encryptMessageContent(data);

    this.sendToExchange(settings.PUBLISH_MESSAGES_TO, routingKey, encryptedData, options);
};

AMQPConnection.prototype.sendData = function sendData(data, headers) {
    const settings = this.settings;

    const msgHeaders = data.headers || {};

    const routingKey = getRoutingKeyFromHeaders(msgHeaders) || settings.DATA_ROUTING_KEY;

    this.prepareMessageAndSendToExchange(data, headers, routingKey);
};

AMQPConnection.prototype.sendHttpReply = function sendHttpReply(data, headers) {

    const routingKey = getRoutingKeyFromHeaders(headers);

    if (!routingKey) {
        throw new Error(
            `Component emitted \'httpReply\' event but ${HEADER_ROUTING_KEY} was not found in AMQP headers`);
    }
    this.prepareMessageAndSendToExchange(data, headers, routingKey);
};

AMQPConnection.prototype.sendError = function sendError(err, headers, originalMessageContent) {
    var settings = this.settings;
    var options = getOptions(headers);

    var encryptedError = encryptor.encryptMessageContent({
        name: err.name,
        message: err.message,
        stack: err.stack
    });

    var payload = {
        error: encryptedError
    };

    if (originalMessageContent && originalMessageContent !== '') {
        payload.errorInput = originalMessageContent.toString();
    }
    var errorPayload = JSON.stringify(payload);

    this.sendToExchange(settings.PUBLISH_MESSAGES_TO, settings.ERROR_ROUTING_KEY, errorPayload, options);

    if (headers.reply_to) {
        console.log('Sending error to', headers.reply_to);
        var replyToOptions = _.cloneDeep(options);
        replyToOptions.headers[HEADER_ERROR_RESPONSE] = true;
        this.sendToExchange(settings.PUBLISH_MESSAGES_TO, headers.reply_to, encryptedError, replyToOptions);
    }
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
        var options = getOptions(_.cloneDeep(headers), getExpiration(reboundIteration));
        options.headers.reboundIteration = reboundIteration;

        this.sendToExchange(
            settings.PUBLISH_MESSAGES_TO,
            settings.REBOUND_ROUTING_KEY,
            originalMessage.content,
            options
        );
    }

    function getReboundIteration(previousIteration) {
        if (previousIteration && typeof previousIteration === 'number') {
            return previousIteration + 1;
        }
        return 1;
    }

    // retry in 15 sec, 30 sec, 1 min, 2 min, 4 min, 8 min, etc.
    function getExpiration(iteration) {
        return Math.pow(2, iteration - 1) * settings.REBOUND_INITIAL_EXPIRATION;
    }
};

AMQPConnection.prototype.sendSnapshot = function sendSnapshot(data, headers) {
    var settings = this.settings;
    var options = getOptions(headers);
    var exchange = settings.PUBLISH_MESSAGES_TO;
    var routingKey = settings.SNAPSHOT_ROUTING_KEY;
    try {
        var payload = JSON.stringify(data);
    } catch (e) {
        return console.error('A snapshot should be a valid JSON');
    }
    this.sendToExchange(exchange, routingKey, payload, options);
};

function getOptions(headers, expiration) {
    var result = {
        contentType: 'application/json',
        contentEncoding: 'utf8',
        mandatory: true,
        headers: headers
    };

    if (expiration) {
        result.expiration = expiration;
    }
    return result;
}

function getRoutingKeyFromHeaders(headers) {
    if (!headers) {
        return null;
    }

    function headerNamesToLowerCase(result, value, key) {
        result[key.toLowerCase()] = value;
    }

    var lowerCaseHeaders = _.transform(headers, headerNamesToLowerCase, {});

    return lowerCaseHeaders[HEADER_ROUTING_KEY];
}
