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
        try {
            var decryptedContent = cipher.decryptMessageContent(message.content);
        } catch (err) {
            info('Error occured while parsing message #%j payload (%s)', message.fields.deliveryTag, err.message);
            return self.ack(message, false);
        }

        try {
            // pass to callback both derypted content & original message
            callback(decryptedContent, message);
        } catch (err) {
            info('Failed to process message #%j, reject', message.fields.deliveryTag);
            return self.ack(message, false);
        }
    });
};

AMQPConnection.prototype.ack = function ack(message, ack) {
    if (ack === false) {
        this.subscribeChannel.reject(message, false);
    } else {
        info('Message #%j ack', message.fields.deliveryTag);
        this.subscribeChannel.ack(message);
    }
};

AMQPConnection.prototype.sendToExchange = function sendToExchange(exchangeName, routingKey, payload, options, encrypt) {
    debug('Pushing to exchange=%s, routingKey=%s, data=%j, options=%j', exchangeName, routingKey, payload, options);
    var content = encrypt ? cipher.encryptMessageContent(payload) : payload;
    try {
        this.publishChannel.publish(exchangeName, routingKey, new Buffer(content), options);
    } catch (err) {
        debug('Failed to publish message to exchange %s, %s', exchangeName, err.message);
    }
};

AMQPConnection.prototype.sendData = function sendData(data, originalMessage, headers) {
    var settings = this.settings;
    var options = {
        contentType: 'application/json',
        contentEncoding: 'utf8',
        mandatory: true,
        headers: headers
    };
    this.sendToExchange(settings.PUBLISH_MESSAGES_TO, settings.DATA_ROUTING_KEY, data, options, true);
};

AMQPConnection.prototype.sendError = function sendError(err, originalMessage, headers) {
    var settings = this.settings;
    var options = {
        contentType: 'application/json',
        contentEncoding: 'utf8',
        mandatory: true,
        headers: headers
    };
    var payload = {
        message: err.message,
        stack: err.stack
    };
    this.sendToExchange(settings.PUBLISH_MESSAGES_TO, settings.ERROR_ROUTING_KEY, payload, options, true);
};

AMQPConnection.prototype.sendRebound = function sendRebound(reboundError, originalMessage, headers) {
    var settings = this.settings;

    debug('Rebound message: %j', originalMessage);

    var options = cloneMessageOptions(originalMessage);
    options.headers.reboundIteration = getNextReboundIteration(options.headers.reboundIteration);
    options.expiration = getNextReboundExpiration(options.headers.reboundIteration);

    if (options.headers.reboundIteration > settings.REBOUND_LIMIT) {
        this.sendError(new Error('Rebound limit exceeded'), originalMessage, headers);
    } else {
        this.sendToExchange(settings.PUBLISH_MESSAGES_TO, settings.REBOUND_ROUTING_KEY, originalMessage.content, options, false);
    }

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
};





