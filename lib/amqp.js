const log = require('./logging.js');
const amqplib = require('amqplib');
const encryptor = require('./encryptor.js');
const co = require('co');
const _ = require('lodash');

const HEADER_ROUTING_KEY = 'x-eio-routing-key';
const HEADER_ERROR_RESPONSE = 'x-eio-error-response';

class Amqp {
    constructor(settings) {
        this.settings = settings;
    }

    connect(uri) {
        return co(function* connect(){
            this.amqp = yield amqplib.connect(uri);
            log.debug('Connected to AMQP');

            this.subscribeChannel = yield this.amqp.createChannel();
            this.subscribeChannel.on('error', log.criticalError);
            log.debug('Opened subscribe channel');

            this.publishChannel = yield this.amqp.createChannel();
            this.publishChannel.on('error', log.criticalError);
            log.debug('Opened publish channel');
        }.bind(this));
    }

    disconnect() {
        log.trace('Close AMQP connections');
        try {
            this.subscribeChannel.close();
        } catch (alreadyClosed) {
            log.debug('Subscribe channel is closed already');
        }
        try {
            this.publishChannel.close();
        } catch (alreadyClosed) {
            log.debug('Publish channel is closed already');
        }
        try {
            this.amqp.close();
        } catch (alreadyClosed) {
            log.debug('AMQP connection is closed already');
        }
        log.debug('Successfully closed AMQP connections');
        return Promise.resolve();
    }

    listenQueue(queueName, callback) {
        const self = this;

        this.subscribeChannel.prefetch(this.settings.RABBITMQ_PREFETCH_SAILOR);

        return this.subscribeChannel.consume(queueName, function decryptMessage(message) {
            log.trace('Message received: %j', message);

            if (message === null) {
                log.warn('NULL message received');
                return;
            }

            let decryptedContent;
            try {
                decryptedContent = encryptor.decryptMessageContent(message.content, message.properties.headers);
            } catch (err) {
                console.error(
                    'Error occurred while parsing message #%j payload (%s)',
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
    }

    ack(message) {
        log.debug('Message #%j ack', message.fields.deliveryTag);
        this.subscribeChannel.ack(message);
    }

    reject(message) {
        log.debug('Message #%j reject', message.fields.deliveryTag);
        return this.subscribeChannel.reject(message, false);
    }

    sendToExchange(exchangeName, routingKey, payload, options) {
        log.trace('Pushing to exchange=%s, routingKey=%s, data=%j, options=%j', exchangeName, routingKey, payload, options);
        try {
            this.publishChannel.publish(exchangeName, routingKey, new Buffer(payload), options);
        } catch (err) {
            log.error('Failed to publish message to exchange %s, %s', exchangeName, err.message);
        }
    }

    prepareMessageAndSendToExchange(data, properties, routingKey) {
        const settings = this.settings;
        data.headers = filterMessageHeaders(data.headers);
        const encryptedData = encryptor.encryptMessageContent(data);

        this.sendToExchange(settings.PUBLISH_MESSAGES_TO, routingKey, encryptedData, properties);
    }

    sendData(data, properties) {
        const settings = this.settings;

        const msgHeaders = data.headers || {};

        const routingKey = getRoutingKeyFromHeaders(msgHeaders) || settings.DATA_ROUTING_KEY;

        this.prepareMessageAndSendToExchange(data, properties, routingKey);
    }

    sendHttpReply(data, properties) {

        const routingKey = properties.headers.reply_to;

        if (!routingKey) {
            throw new Error(
                `Component emitted \'httpReply\' event but \'reply_to\' was not found in AMQP headers`);
        }
        this.prepareMessageAndSendToExchange(data, properties, routingKey);
    }

    sendError(err, properties, originalMessageContent) {
        const settings = this.settings;
        const headers = properties.headers;

        const encryptedError = encryptor.encryptMessageContent({
            name: err.name,
            message: err.message,
            stack: err.stack
        });

        const payload = {
            error: encryptedError
        };

        if (originalMessageContent && originalMessageContent !== '') {
            payload.errorInput = originalMessageContent.toString();
        }
        const errorPayload = JSON.stringify(payload);

        this.sendToExchange(settings.PUBLISH_MESSAGES_TO, settings.ERROR_ROUTING_KEY, errorPayload, properties);

        if (headers.reply_to) {
            console.log('Sending error to', headers.reply_to);
            const replyToOptions = _.cloneDeep(properties);
            replyToOptions.headers[HEADER_ERROR_RESPONSE] = true;
            this.sendToExchange(settings.PUBLISH_MESSAGES_TO, headers.reply_to, encryptedError, replyToOptions);
        }
    }

    sendRebound(reboundError, originalMessage, properties) {
        const settings = this.settings;

        log.trace('Rebound message: %j', originalMessage);
        const reboundIteration = getReboundIteration(originalMessage.properties.headers.reboundIteration);

        if (reboundIteration > settings.REBOUND_LIMIT) {
            return this.sendError(
                new Error('Rebound limit exceeded'),
                properties,
                originalMessage.content
            );
        } else {
            properties.expiration = getExpiration(reboundIteration);
            properties.headers.reboundIteration = reboundIteration;

            this.sendToExchange(
                settings.PUBLISH_MESSAGES_TO,
                settings.REBOUND_ROUTING_KEY,
                originalMessage.content,
                properties
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
    }

    sendSnapshot(data, properties) {
        const settings = this.settings;
        const exchange = settings.PUBLISH_MESSAGES_TO;
        const routingKey = settings.SNAPSHOT_ROUTING_KEY;
        let payload;
        try {
            payload = JSON.stringify(data);
        } catch (e) {
            return console.error('A snapshot should be a valid JSON');
        }
        this.sendToExchange(exchange, routingKey, payload, properties);
    }
}

function copyAmqpHeadersToMessage(amqpMsg, msg) {
    const source = amqpMsg.properties.headers;

    if (!msg.headers) {
        msg.headers = {};
    }

    if (source.reply_to) {
        msg.headers.reply_to = source.reply_to;
    }
}

function getRoutingKeyFromHeaders(headers) {
    if (!headers) {
        return null;
    }

    function headerNamesToLowerCase(result, value, key) {
        result[key.toLowerCase()] = value;
    }

    const lowerCaseHeaders = _.transform(headers, headerNamesToLowerCase, {});

    return lowerCaseHeaders[HEADER_ROUTING_KEY];
}

function filterMessageHeaders(headers = {}) {
    return _.transform(headers, (result, value, key) => {
        if ([HEADER_ROUTING_KEY].includes(key.toLowerCase())) {
            return;
        }
        result[key] = value;
    }, {});
}

exports.Amqp = Amqp;
