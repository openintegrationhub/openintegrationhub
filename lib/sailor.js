var settings = require('./settings.js');
var ComponentReader = require('./component_reader.js').ComponentReader;
var MongoConnection = require('./mongo.js').MongoConnection;
var AMQPConnection = require('./amqp.js').AMQPConnection;
var TaskExec = require('./executor.js').TaskExec;
var Q = require('q');
var debug = require('debug')('sailor');

var mongoConnection = new MongoConnection();
var amqpConnection = new AMQPConnection();
var componentReader = new ComponentReader();

exports.connect = function connect(){

    var mongoConnected = mongoConnection.connect(settings.MONGO_URI);
    var amqpConnected = amqpConnection.connect(settings.AMQP_URI);
    var componentFound = componentReader.init(settings.COMPONENT_PATH);

    return Q.all([mongoConnected, amqpConnected, componentFound]);
};

exports.run = function run(){
    debug("Start listening %s", settings.INCOMING_MESSAGES_QUEUE.name);
    amqpConnection.listenQueue(settings.INCOMING_MESSAGES_QUEUE.name, exports.processMessage);
};

exports.getStepInfo = function getStepInfo(taskId, stepId){
    return JSON.parse(process.env.STEP_INFO);
};

exports.getStepConfiguration = function getStepConfiguration(taskId, stepId){
    return {
        "customFilter" : "{\"Last_Date_Modified\":\">04142015\"}",
        "contactType" : "Person",
        "_account" : "552e7f8c76a1521344000001"
    };
};

exports.processMessage = function processMessage(message) {

    debug('Message arrived %j', message);

    var headers = message.properties.headers;
    var taskId = headers.taskId;
    var stepId = headers.stepId;

    var step = exports.getStepInfo(taskId, stepId);
    var cfg = exports.getStepConfiguration(taskId, stepId);

    return componentReader.findTriggerOrAction(step.function).then(function(module){

        var taskExec = new TaskExec();

        taskExec.onData = function onData(data){
            debug('Data received %j', data);
            var newMessage = {
                payload: data
            };
            amqpConnection.sendToQueue(settings.OUTGOING_MESSAGES_QUEUE.name, newMessage);
        };

        taskExec.onRebound = function onRebound(err){
            debug('Rebound received');
            amqpConnection.rebound(message, err);
        };

        taskExec.onError = function onError(err){
            debug('Error received');
            var errorMessage = {
                payload: err
            };
            amqpConnection.sendToQueue(settings.ERRORS_QUEUE.name, errorMessage);
        };

        taskExec.onEnd = function onEnd(){
            debug('End received');
            amqpConnection.ack(message);
        };

        return taskExec.process(module, message, cfg);
    });





};