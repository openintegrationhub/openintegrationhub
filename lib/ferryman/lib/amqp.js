
/* eslint consistent-return: 0 */ // --> OFF
/* eslint no-underscore-dangle: 0 */ // --> OFF
/* eslint no-use-before-define: 0 */ // --> OFF

const amqplib = require('amqplib');
const { IllegalOperationError } = require('amqplib/lib/error');
const _ = require('lodash');
const eventToPromise = require('event-to-promise');
const uuid = require('uuid');
const encryptor = require('./encryptor.js');
const log = require('./logging.js');

const HEADER_ROUTING_KEY = 'x-eio-routing-key';
const HEADER_ERROR_RESPONSE = 'x-eio-error-response';

class Amqp {
    constructor(settings) {
        this.settings = settings;
    }

    async connect(uri) {
        this.consumerTag = null;
        this.amqp = await amqplib.connect(uri);
        if (process.env.NODE_ENV !== 'test') {
            this.amqp.on('error', log.criticalErrorAndExit.bind(log, 'amqp.error'));
            this.amqp.on('close', log.criticalErrorAndExit.bind(log, 'amqp.close'));
        }
        log.debug('Connected to AMQP');

        this.subscribeChannel = await this.amqp.createChannel();
        this.subscribeChannel.on('error', log.criticalErrorAndExit.bind(log, 'subscribeChannel.error'));
        log.debug('Opened subscribe channel');

        this.publishChannel = await this.amqp.createConfirmChannel();
        this.publishChannel.on('error', log.criticalErrorAndExit.bind(log, 'publishChannel.error'));
        log.debug('Opened publish channel');
    }

    async disconnect() {
        log.trace('Close AMQP connections');
        this.amqp.removeAllListeners('close');
        try {
            await this.listenQueueCancel();
            await this.subscribeChannel.close();
        } catch (alreadyClosed) {
            log.debug('Subscribe channel is closed already');
        }
        try {
            await this.publishChannel.close();
        } catch (alreadyClosed) {
            log.debug('Publish channel is closed already');
        }
        try {
            await this.amqp.close();
        } catch (alreadyClosed) {
            log.debug('AMQP connection is closed already');
        }
        log.debug('Successfully closed AMQP connections');
    }

    async listenQueue(queueName, callback) {
        if (this.consumerTag) {
            throw new Error('listenQueue MUST NOT be called more than once');
        }
        this.subscribeChannel.prefetch(this.settings.RABBITMQ_PREFETCH_SAILOR);

        const result = await this.subscribeChannel.consume(
            queueName, this.decryptMessage.bind(this, callback),
        );
        this.consumerTag = result.consumerTag;
        return result;
    }

    async listenQueueCancel() {
        log.trace('listenQueueCancel starting');
        if (!this.consumerTag) {
            log.debug('listenQueueCancel is not executed since this.consumerTag is falsy');
            return;
        }
        if (!this.subscribeChannel) {
            log.warn('listenQueueCancel called when this.subscribeChannel is falsy');
            return;
        }
        await this.subscribeChannel.cancel(this.consumerTag);
        this.consumerTag = null;
        log.debug('listenQueueCancel success');
    }

    decryptMessage(callback, message) {
        log.trace('Message received: %j', message);

        if (message === null) {
            log.warn('NULL message received');
            return;
        }

        const protocolVersion = Number(message.properties.headers.protocolVersion || 1);
        let decryptedContent;
        try {
            decryptedContent = encryptor.decryptMessageContent(
                message.content,
                protocolVersion < 2 ? 'base64' : undefined,
            );
        } catch (err) {
            log.error(err,
                'Error occurred while parsing message #%j payload',
                message.fields.deliveryTag);
            return this.reject(message);
        }
        decryptedContent.headers = decryptedContent.headers || {};
        if (message.properties.headers.reply_to) {
            decryptedContent.headers.reply_to = message.properties.headers.reply_to;
        }

        try {
            // pass to callback both decrypted content & original message
            callback(decryptedContent, message);
        } catch (err) {
            log.error(err, 'Failed to process message #%j, reject', message.fields.deliveryTag);
            return this.reject(message);
        }
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
        const buffer = Buffer.from(payload);

        return this.publishMessage(exchangeName, routingKey, buffer, options, 0);
    }

    async publishMessage(exchangeName, routingKey, payloadBuffer, options, iteration) {
        const { settings } = this;
        if (iteration) {
            options.headers.retry = iteration; // eslint-disable-line no-param-reassign
        }

        log.debug('Current memory usage: %s Mb', process.memoryUsage().heapUsed / 1048576);
        log.trace('Pushing to exchange=%s, routingKey=%s, messageSize=%d, options=%j, iteration=%d',
            exchangeName, routingKey, payloadBuffer.length, options, iteration);
        try {
            const result = await this._promisifiedPublish(
                exchangeName, routingKey, payloadBuffer, options,
            );
            if (!result) {
                log.warn('Buffer full when publishing a message to '
          + 'exchange=%s with routingKey=%s', exchangeName, routingKey);
            }
            return result;
        } catch (error) {
            if (error instanceof IllegalOperationError) {
                log.error(error, `Failed on publishing ${options.headers.messageId} message to MQ`);
                throw new Error(`Failed on publishing ${options.headers.messageId} message to MQ: ${error}`);
            }
            log.error(error, 'Failed on publishing message to queue');
            const delay = this._getDelay(
                settings.AMQP_PUBLISH_RETRY_DELAY,
                settings.AMQP_PUBLISH_MAX_RETRY_DELAY,
                iteration,
            );
            await this._sleep(delay);
            iteration += 1; // eslint-disable-line no-param-reassign
            if (iteration < settings.AMQP_PUBLISH_RETRY_ATTEMPTS) {
                return this.publishMessage(exchangeName, routingKey, payloadBuffer, options, iteration);
            }
            throw new Error(`Failed on publishing ${options.headers.messageId} message to MQ: ${error}`);
        }
    }

    // eslint-disable-next-line class-methods-use-this
    _getDelay(defaultDelay, maxDelay, iteration) {
        log.debug({ defaultDelay }, 'Current delay');
        log.debug({ maxDelay }, 'Current delay');
        // eslint-disable-next-line no-restricted-properties
        const delay = Math.min(defaultDelay * Math.pow(2, iteration), maxDelay);
        log.debug({ delay }, 'Calculated delay');
        return delay;
    }

    // eslint-disable-next-line class-methods-use-this
    async _sleep(time) {
        await new Promise(resolve => setTimeout(resolve, time));
    }

    async _promisifiedPublish(exchangeName, routingKey, payloadBuffer, options) {
        try {
            let result;
            const { publishChannel } = this;
            const publishPromise = new Promise((resolve, reject) => {
                result = publishChannel.publish(
                    exchangeName, routingKey, payloadBuffer, options, (err, ok) => {
                        err ? reject(err) : resolve(ok); // eslint-disable-line no-unused-expressions
                    },
                );
            });
            await Promise.all([
                (async () => {
                    if (this.settings.PROCESS_AMQP_DRAIN && !result) {
                        log.debug('Amqp buffer is full: waiting for drain event..');
                        await eventToPromise(this.publishChannel, 'drain');
                        log.debug('Amqp buffer drained!');
                        result = true;
                    }
                })(),
                publishPromise
            ]);
            return result;
        } catch (error) {
            throw error;
        }
    }

    // eslint-disable-next-line class-methods-use-this
    encryptMessageContent(body, protocolVersion = 1) {
        return encryptor.encryptMessageContent(
            body,
            protocolVersion < 2
                ? 'base64'
                : undefined,
        );
    }

    async prepareMessageAndSendToExchange(data, properties, routingKey, throttle) { // , backChannel
        const { settings } = this;

        // eslint-disable-next-line
    data.headers = filterMessageHeaders(data.headers);
        const protocolVersion = Number(properties.headers.protocolVersion || 1);

        const encryptedData = this.encryptMessageContent(data, protocolVersion);

        if (encryptedData.length > settings.OUTGOING_MESSAGE_SIZE_LIMIT) {
            const error = new Error(`Outgoing message size ${encryptedData.length}`
        + ` exceeds limit of ${settings.OUTGOING_MESSAGE_SIZE_LIMIT}.`);
            log.error(error);
            throw error;
        }

        // if (backChannel === true) {
        //     return this.sendToExchange(
        // settings.BACKCHANNEL_EXCHANGE, routingKey, encryptedData, properties, throttle);
        // }

        return this.sendToExchange(
            settings.BACKCHANNEL_EXCHANGE, routingKey, encryptedData, properties, throttle,
        );
    }

    // async sendData(data, headers, throttle) {
    //     const properties = this._createPropsFromHeaders(headers);
    //     const settings = this.settings;
    //     const routingKey = getRoutingKeyFromHeaders(data.headers) || settings.DATA_ROUTING_KEY;
    //     properties.headers.protocolVersion = settings.PROTOCOL_VERSION;

    //     return this.prepareMessageAndSendToExchange(data, properties, routingKey, throttle);
    // }

    async sendBackChannel(data, headers, throttle) {
        const properties = this._createPropsFromHeaders(headers);
        const { settings } = this;

        const routingKey = getRoutingKeyFromHeaders(data.headers) || settings.OUTPUT_ROUTING_KEY;
        properties.headers.protocolVersion = settings.PROTOCOL_VERSION;


        return this.prepareMessageAndSendToExchange(data, properties, routingKey, throttle, true);
    }

    async sendHttpReply(data, headers) {
        const properties = this._createPropsFromHeaders(headers);
        const routingKey = headers.reply_to;
        properties.headers.protocolVersion = 1;

        if (!routingKey) {
            throw new Error('Component emitted \'httpReply\' event but \'reply_to\' was not found in AMQP headers');
        }
        return this.prepareMessageAndSendToExchange(data, properties, routingKey);
    }

    async sendError(err, headers, originalMessage, throttle) {
        const properties = this._createPropsFromHeaders(headers);
        const { settings } = this;

        const encryptedError = encryptor.encryptMessageContent({
            name: err.name,
            message: err.message,
            stack: err.stack
        }, 'base64').toString();

        const payload = {
            error: encryptedError
        };
        if (originalMessage && originalMessage.content) {
            // TODO inconsistency with sendData. sendData build protocol version from settings
            // but send Error takes it from headers.
            const protocolVersion = Number(originalMessage.properties.headers.protocolVersion || 1);
            if (protocolVersion >= 2) {
                payload.errorInput = encryptor.encryptMessageContent(
                    encryptor.decryptMessageContent(originalMessage.content),
                    'base64',
                ).toString();
            } else {
                payload.errorInput = originalMessage.content.toString();
            }
        }
        const errorPayload = JSON.stringify(payload);

        let result = this.sendToExchange(settings.BACKCHANNEL_EXCHANGE, settings.ERROR_ROUTING_KEY,
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

    async sendRebound(reboundError, originalMessage, headers) {
    // TODO: inconsistency
    // rebound message should be
    // a) repacked to currently used protocol version
    // b) passed as is
    // not as it's done now: send rebound but take protocolVersion header from current context
    // TODO double think about: why we need headers as argument here?
    // seems that rebound should be published with same headers as received
    // seems that answer is error, when rebound limit is exceeded.
        const properties = this._createPropsFromHeaders(headers);
        const { settings } = this;

        log.trace('Rebound message: %j', originalMessage);
        const reboundIteration = getReboundIteration(
            originalMessage.properties.headers.reboundIteration,
        );

        if (reboundIteration > settings.REBOUND_LIMIT) {
            return this.sendError(
                new Error('Rebound limit exceeded'),
                headers,
                originalMessage,
            );
        }
        properties.expiration = getExpiration(reboundIteration);
        properties.headers.reboundIteration = reboundIteration;

        return this.sendToExchange(
            settings.BACKCHANNEL_EXCHANGE,
            settings.REBOUND_ROUTING_KEY,
            originalMessage.content,
            properties,
        );


        function getReboundIteration(previousIteration) {
            if (previousIteration && typeof previousIteration === 'number') {
                return previousIteration + 1;
            }
            return 1;
        }

        // retry in 15 sec, 30 sec, 1 min, 2 min, 4 min, 8 min, etc.
        function getExpiration(iteration) {
            // eslint-disable-next-line no-restricted-properties
            return Math.pow(2, iteration - 1) * settings.REBOUND_INITIAL_EXPIRATION;
        }
    }

    async sendSnapshot(data, headers, throttle, passedRoutingKey) {
        const { settings } = this;
        const exchange = settings.BACKCHANNEL_EXCHANGE;
        const routingKey = (passedRoutingKey) || settings.SNAPSHOT_ROUTING_KEY;
        const payload = JSON.stringify(data);
        const properties = this._createPropsFromHeaders(headers);
        return this.sendToExchange(exchange, routingKey, payload, properties, throttle);
    }

    // eslint-disable-next-line class-methods-use-this
    _createPropsFromHeaders(headers) {
        return {
            contentType: 'application/json',
            contentEncoding: 'utf8',
            mandatory: true,
            headers: {
                ...headers,
                messageId: headers.messageId || uuid.v4()
            }
        };
    }
}

function getRoutingKeyFromHeaders(headers) {
    if (!headers) {
        return null;
    }

    function headerNamesToLowerCase(result, value, key) {
    // eslint-disable-next-line no-param-reassign
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
        // eslint-disable-next-line no-param-reassign
        result[key] = value;
    }, {});
}

exports.Amqp = Amqp;
