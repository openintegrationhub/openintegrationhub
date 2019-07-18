const log = require('./logging.js');
const amqplib = require('amqplib');
const encryptor = require('./encryptor.js');
const co = require('co');
const _ = require('lodash');
const eventToPromise = require('event-to-promise');

const HEADER_ROUTING_KEY = 'x-eio-routing-key';
const HEADER_ERROR_RESPONSE = 'x-eio-error-response';

class Amqp {
    constructor(settings) {
        this.settings = settings;
    }

    connect(uri) {
        return co(function* connect() {
            this.amqp = yield amqplib.connect(uri);
            if (process.env.NODE_ENV !== 'test') {
                this.amqp.on('error', log.criticalErrorAndExit);
                this.amqp.on('close', log.criticalErrorAndExit);
            }
            log.debug('Connected to AMQP');

            this.subscribeChannel = yield this.amqp.createChannel();
            this.subscribeChannel.on('error', log.criticalErrorAndExit);
            log.debug('Opened subscribe channel');

            this.publishChannel = yield this.amqp.createConfirmChannel();
            this.publishChannel.on('error', log.criticalErrorAndExit);
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
        //eslint-disable-next-line consistent-this
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
                log.error(err,
                    'Error occurred while parsing message #%j payload',
                    message.fields.deliveryTag,
                );
                return self.reject(message);
            }

            copyAmqpHeadersToMessage(message, decryptedContent);

            try {
                // pass to callback both decrypted content & original message
                callback(decryptedContent, message);
            } catch (err) {
                log.error(err, 'Failed to process message #%j, reject', message.fields.deliveryTag);
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

    async sendToExchange(exchangeName, routingKey, payload, options, throttle) {
        if (throttle) {
            await throttle();
        }
        log.trace('Pushing to exchange=%s, routingKey=%s, data=%j, '
            + 'options=%j', exchangeName, routingKey, payload, options);
        log.debug('Current memory usage: %s Mb', process.memoryUsage().heapUsed / 1048576);

        const result = await this.publishMessage(exchangeName, routingKey, Buffer.from(payload), options, 0);
        if (this.settings.PROCESS_AMQP_DRAIN) {
            if (result) {
                return result;
            } else {
                log.debug('Amqp buffer is full: waiting for drain event..');
                return eventToPromise(this.publishChannel, 'drain').then(() => true);
            }
        } else {
            return result;
        }
    }

    async publishMessage(exchangeName, routingKey, payloadBuffer, options, iteration) {
        const settings = this.settings;
        const result = this.publishChannel.publish(exchangeName, routingKey, payloadBuffer, options);
        if (!result) {
            log.warn('Buffer full when publishing a message to '
                + 'exchange=%s with routingKey=%s', exchangeName, routingKey);
        }

        try {
            await this.publishChannel.waitForConfirms();
        } catch (error) {
            log.error('Failed on publishing message to queue');
            await new Promise(resolve => { setTimeout(resolve, settings.AMQP_PUBLISH_RETRY_DELAY); });
            iteration += 1;
            if (iteration < settings.AMQP_PUBLISH_RETRY_ATTEMPTS) {
                return await this.publishMessage(exchangeName, routingKey, payloadBuffer, options, iteration);
            } else {
                throw new Error(`failed on publishing ${options.headers.messageId} message to MQ: ` + error);
            }
        }

        return result;
    }

    async prepareMessageAndSendToExchange(data, properties, routingKey, throttle) {
        const settings = this.settings;
        data.headers = filterMessageHeaders(data.headers);
        const encryptedData = encryptor.encryptMessageContent(data);

        return this.sendToExchange(settings.PUBLISH_MESSAGES_TO, routingKey, encryptedData, properties, throttle);
    }

    async sendData(data, properties, throttle) {
        const settings = this.settings;

        const msgHeaders = data.headers || {};

        const routingKey = getRoutingKeyFromHeaders(msgHeaders) || settings.DATA_ROUTING_KEY;

        return this.prepareMessageAndSendToExchange(data, properties, routingKey, throttle);
    }

    async sendHttpReply(data, properties) {
        const routingKey = properties.headers.reply_to;

        if (!routingKey) {
            throw new Error(`Component emitted 'httpReply' event but 'reply_to' was not found in AMQP headers`);
        }
        return this.prepareMessageAndSendToExchange(data, properties, routingKey);
    }

    async sendError(err, properties, originalMessageContent, throttle) {
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

        let result = this.sendToExchange(settings.PUBLISH_MESSAGES_TO, settings.ERROR_ROUTING_KEY,
            errorPayload, properties, throttle);

        if (headers.reply_to) {
            log.debug('Sending error to %s', headers.reply_to);
            const replyToOptions = _.cloneDeep(properties);
            replyToOptions.headers[HEADER_ERROR_RESPONSE] = true;
            result = this.sendToExchange(settings.PUBLISH_MESSAGES_TO,
                headers.reply_to, encryptedError, replyToOptions);
        }

        return result;
    }

    async sendRebound(reboundError, originalMessage, properties) {
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

            return this.sendToExchange(
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

    async sendSnapshot(data, properties, throttle) {
        const settings = this.settings;
        const exchange = settings.PUBLISH_MESSAGES_TO;
        const routingKey = settings.SNAPSHOT_ROUTING_KEY;
        let payload;
        payload = JSON.stringify(data);
        return this.sendToExchange(exchange, routingKey, payload, properties, throttle);
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
