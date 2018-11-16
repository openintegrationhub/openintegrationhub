const Q = require('q');
const _ = require('lodash');
const uuid = require('uuid');
const commons = require('@elastic.io/commons');
const rootLogger = require('@elastic.io/bunyan-logger');
const cipher = commons.rabbitmqMsgCipher.getCurrentCipher();
const amqp = commons.amqp;
const init = require('./init');

const HEADER_ERROR_RESPONSE = 'x-eio-error-response';
const HEADER_CONTENT_TYPE = 'content-type';
const HEADER_ROUTING_KEY = 'x-eio-routing-key';
const DEFAULT_CONTENT_TYPE = 'application/json';

const exchanges = new Set();


function prepareErrorResponse(amqpHeaders, reply) {
    const stepId = amqpHeaders.stepId;
    const compId = amqpHeaders.compId;
    const compFunc = amqpHeaders.function;

    const body = {
        message: `Component ${compId} failed when executing function ${compFunc} (step=${stepId})`,
        error: {
            message: reply.message,
            stack: reply.stack
        }
    };
    return {
        body: body,
        headers: {
            'Content-Type': DEFAULT_CONTENT_TYPE
        }
    };
}

function lowerCaseHeaders(headers) {
    const headerNamesToLowerCase = (result, value, key) => {
        result[key.toLowerCase()] = value;
    };

    return _.transform(headers, headerNamesToLowerCase, {});
}

function isErrorResponse(amqpHeaders) {
    const headers = lowerCaseHeaders(amqpHeaders);

    return !!headers[HEADER_ERROR_RESPONSE];
}

function prepareSuccessResponse(reply) {
    const headers = lowerCaseHeaders(reply.headers || {});
    headers[HEADER_CONTENT_TYPE] = headers[HEADER_CONTENT_TYPE] || DEFAULT_CONTENT_TYPE;

    delete headers[HEADER_ROUTING_KEY];

    return {
        body: reply.body,
        headers: headers
    };
}

function getReplyData(msg) {
    const plaintextContent = cipher.decrypt(msg.content.toString());
    const reply = JSON.parse(plaintextContent);
    const amqpHeaders = msg.properties.headers;

    if (isErrorResponse(amqpHeaders)) {
        return prepareErrorResponse(amqpHeaders, reply);
    }

    return prepareSuccessResponse(reply);
}


function consumeFromQueue(channel, replyQueueName, execId) {
    const deferred = Q.defer();
    const consumerTag = `${execId}_${uuid.v4()}`;
    const config = init.getConfig();
    const timeout = parseInt(config.get('REQUEST_REPLY_TIMEOUT'));
    let replyTimeout;

    rootLogger.debug(`About to subscribe to queue=${replyQueueName}`);


    function clearReplyTimeout() {
        if (replyTimeout) {
            clearTimeout(replyTimeout);

            replyTimeout = null;
        }
    }

    function cancelConsumer() {
        rootLogger.debug(`Canceling consumer ${consumerTag}`);
        channel.cancel(consumerTag);
        deferred.reject(new Error('replyTimeout'));
        clearReplyTimeout();
    }

    function reply(msg) {
        try {
            clearReplyTimeout();
            rootLogger.debug(`Sending reply for execId=${execId}`);
            deferred.resolve(getReplyData(msg));

        } catch (e) {
            rootLogger.error(e);
            deferred.reject(e);
        } finally {
            cancelConsumer();
        }
    }

    const consumeOptions = {
        noAck: true,
        consumerTag: consumerTag
    };

    channel.consume(replyQueueName, reply, consumeOptions);
    replyTimeout = setTimeout(() => {
        rootLogger.info('cancel consumer due to replyTimeout');
        cancelConsumer();
    }, timeout);
    return {
        promise: deferred.promise,
        cancel: () => cancelConsumer()
    };
}


function getReplyQueueName(execId) {
    return `request_reply_queue_${execId}`;
}

function getReplyRoutingKey(execId) {
    return `request_reply_key_${execId}`;
}

function assertExchange(channel, exchangeName) {
    const type = 'topic';
    const options = {
        durable: true,
        autoDelete: false
    };

    if (exchanges.has(exchangeName)) {
        rootLogger.debug('do not create exchange');
        return Promise.resolve();
    }
    function assertExchangeSuccess() {
        exchanges.add(exchangeName);
        rootLogger.debug('Created exchange %s', exchangeName);
    }
    return channel.assertExchange(exchangeName, type, options)
        .then(assertExchangeSuccess);
}

function assertQueue(channel, queueName) {
    const options = {
        durable: true,
        exclusive: true,
        autoDelete: true,
        expires: 60 * 1000
    };

    function assertQueueSuccess() {
        rootLogger.debug('Created queue %s', queueName);
    }
    return channel.assertQueue(queueName, options)
        .then(assertQueueSuccess);
}

function bindQueue(channel, queueName, exchangeName, routingKey) {

    function subscribeQueueToKeySuccess() {
        rootLogger.debug('Send keys %s to queue %s ', routingKey, queueName);
    }
    return channel.bindQueue(queueName, exchangeName, routingKey)
        .then(subscribeQueueToKeySuccess);
}

function deleteQueue(channel, queueName) {
    return channel.deleteQueue(queueName);
}

function getUserExchangeName(task) {
    return amqp.getTaskExchange(task);
}

function prepareReplyQueue(channel, task, execId) {
    const exchangeName = getUserExchangeName(task);
    const replyQueueName = getReplyQueueName(execId);
    const routingKey = getReplyRoutingKey(execId);

    return {
        assertExchange: () => assertExchange(channel, exchangeName),
        assertQueue: () => assertQueue(channel, replyQueueName),
        bindQueue: () => bindQueue(channel, replyQueueName, exchangeName, routingKey),
        deleteQueue: () => deleteQueue(channel, replyQueueName)
    };
}

function consumeFromReplyQueue(channel, execId) {
    const replyQueueName = getReplyQueueName(execId);
    return consumeFromQueue(channel, replyQueueName, execId);
}
exports.prepareReplyQueue = prepareReplyQueue;
exports.consumeFromReplyQueue = consumeFromReplyQueue;
exports.getReplyRoutingKey = getReplyRoutingKey;
exports.getUserExchangeName = getUserExchangeName;
