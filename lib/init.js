var commons = require('commons');
var amqplib = require('amqplib');
var async = require("async");
var mongo = commons.mongo;
var amqp = commons.amqp;

var MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/elasticdb';
var AMQP_URI = process.env.AMQP_URI || 'amqp://guest:guest@localhost:5672';
var AMQP_QUEUE_NAME = process.env.AMQP_QUEUE_NAME || getEnvironmentalName('sailor.exchange.');
var AMQP_QUEUE_OPTIONS = {
    durable: true,
    autoDelete: false,
    arguments: {
        //"x-dead-letter-exchange": env.getDeadLetterExchangeName(),
        //"x-dead-letter-routing-key": env.getDeadLetterRoutingKey()
    }
};

function connectToMongo(callback) {
    console.log('Connecting to MongoDB on %s', MONGO_URI);
    mongo.connect(MONGO_URI);
    callback(null, mongo);
}

function amqpConnect(callback) {

    console.log("About to connect to RabbitMQ");
    var amqpConnection = amqplib.connect(AMQP_URI);

    amqpConnection.then(function(connection) {
        connection.createChannel()
            .then(function(channel) {
                console.log('Init channel opened');
                return channel;
            })
            .then(assertQueue)
            .then(closeChannel)
            .then(function() {
                console.log('RabbitMQ connection established, assertion successful');
                callback(null, connection);
            }, function(err) {
                callback(err);
            });
    });

    function assertQueue(channel) {
        var queueOk = channel.assertQueue(AMQP_QUEUE_NAME, AMQP_QUEUE_OPTIONS);
        return queueOk.then(function(queueOk) {
            console.log('Succesfully asserted queue: ' + queueOk.queue);
            return channel;
        });
    }

    function closeChannel(channel) {
        return channel.close().then(function() {
            console.log('Init channel closed, as we don\'t need it anymore');
            return true;
        });
    }
}




function getEnvironmentalName(prefix) {
    var env = process.env.ENVIRONMENT || "development";
    return prefix + env.toLowerCase();
}

function init(cb) {
    async.parallel({
        mongo: connectToMongo,
        subscriberConn: amqpConnect,
        publisherConn: amqpConnect
    }, cb);
}

exports.init = init;
