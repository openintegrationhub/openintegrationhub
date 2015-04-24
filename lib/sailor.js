var amqplib = require('amqplib');
var async = require("async");
var util = require("util");
var events = require("events");
var mongoose = require('mongoose');
var debug = require('debug')('sailor');
var cipher = require('./cipher.js');
var QUEUES = require('./settings.js').QUEUES;

var Sailor = function() {

    events.EventEmitter.call(this);

    var sailor = this;
    var connections = {};

    sailor.init = init;
    sailor.listen = listen;

    function init(cb) {
        async.parallel([
            connectToMongo,
            connectToAMQP
        ], cb);
    }

    function listen(emitter) {
        emitter.on('data', function(){
            debug('Sailor received data event');
        });
        emitter.on('error', function(){
            debug('Sailor received error event');
        });
        emitter.on('snapshot', function(){
            debug('Sailor received snapshot event');
        });
        emitter.on('end', function(){
            debug('Sailor received end event');
        });
    }

    function connectToMongo(callback) {

        mongoose.connect(process.env.MONGO_URI);

        var db = mongoose.connection;
        db.once('open', mongoConnectionSuccess);
        db.on('error', mongoConnectionError);

        function mongoConnectionSuccess() {
            debug('Connected to MongoDB on %s', process.env.MONGO_URI);
            connections.db = db;
            callback(null);
        }

        function mongoConnectionError(err) {
            debug('Failed to connect to MongoDB on %s', process.env.MONGO_URI);
            callback(err);
        }
    }

    function connectToAMQP(callback) {

        return getConnection()
            .then(onConnectionSuccess)
            .then(initSubscribeChannel)
            .then(initPublishChannel)
            .then(startListenMessages)
            .then(onSuccess, callback);

        function getConnection() {
            return amqplib.connect(process.env.AMQP_URI);
        }

        function onConnectionSuccess(connection){
            debug('Connected to RabbitMQ on %s', process.env.AMQP_URI);
            connections.amqp = connection;
        }

        function initSubscribeChannel() {
            return connections.amqp.createChannel().then(function(channel) {
                connections.subscribeChannel = channel;
                assertQueue(channel, QUEUES.subscribe.messages);
            })
        }

        function initPublishChannel() {
            return connections.amqp.createChannel().then(function(channel) {
                connections.publishChannel = channel;
                assertQueue(channel, QUEUES.publish.messages);
                assertQueue(channel, QUEUES.publish.snapshots);
                assertQueue(channel, QUEUES.publish.errors);
            });
        }

        function assertQueue(channel, queue) {
            debug('Assert queue %s', queue.name);
            return channel.assertQueue(queue.name, queue.options);
        }

        function startListenMessages() {
            debug('Start listening %s', QUEUES.subscribe.messages.name);
            connections.subscribeChannel.consume(QUEUES.subscribe.messages.name, onMessage);
        }

        function onMessage(msg) {
            debug('Message arived');
            if (msg.content) {
                try{
                    msg.content = cipher.decrypt(msg.content.toString());
                    //msg.content = JSON.parse(msg.content);
                }catch (err) {
                    console.error('Error occured while parsing message payload.', err);
                    channel.reject(msg, false);
                    return;
                }
            }

            debug('Emit message');
            sailor.emit('message', msg);
        }

        function onSuccess(){
            callback(null);
        }
    }
};

util.inherits(Sailor, events.EventEmitter);

exports.Sailor = Sailor;
