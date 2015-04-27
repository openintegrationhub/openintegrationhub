var debug = require('debug')('sailor');
var mongo = require('./lib/mongo.js');
var amqp = require('./lib/amqp.js');
var Q = require('q');
var ComponentReader = require('./lib/component_reader.js').ComponentReader;
var TaskExec = require('./lib/executor.js').TaskExec;

if (!process.env.MONGO_URI) {
    console.log('MONGO_URI is missing');
    process.exit(1);
}

if (!process.env.AMQP_URI) {
    console.log('AMQP_URI is missing');
    process.exit(1);
}

if (!process.env.COMPONENT_PATH) {
    process.env.COMPONENT_PATH = '../'
}

if (!process.env.INCOMING_MESSAGES_QUEUE) {
    if (!process.env.TASK_ID){
        console.log('TASK_ID is missing');
        process.exit(1);
    }
    if (!process.env.STEP_ID){
        console.log('STEP_ID is missing');
        process.exit(1);
    }
    process.env.INCOMING_MESSAGES_QUEUE = process.env.TASK_ID + ":" + process.env.STEP_ID + ":incoming";
    process.env.OUTGOING_MESSAGES_QUEUE = process.env.TASK_ID + ":" + process.env.STEP_ID + ":outgoing";
    process.env.ERRORS_QUEUE = process.env.TASK_ID + ":" + process.env.STEP_ID + ":errors";
    process.env.REBOUNDS_QUEUE = process.env.TASK_ID + ":" + process.env.STEP_ID + ":rebounds";
}

var mongoConnection = new mongo.MongoConnection();
var mongoConnected = mongoConnection.connect(process.env.MONGO_URI);

var amqpConnection = new amqp.AMQPConnection();
var amqpConnected = amqpConnection.connect(process.env.AMQP_URI);

var componentReader = new ComponentReader();
var componentFound = componentReader.init(process.env.COMPONENT_PATH);

Q.all([mongoConnected, amqpConnected, componentFound])
    .then(run)
    .fail()
    .done();

function run(){
    amqpConnection.listenQueue(amqp.getIncomingMessagesQueueName(), processMessage);
}

function processMessage(message) {

    debug('Message arrived %j', message);

    var headers = message.properties.headers;
    var taskId = headers.taskId;
    var stepId = headers.stepId;

    var step = getStepInfo(taskId, stepId);
    var cfg = getStepCfg(taskId, stepId);

    var triggerOrAction = componentReader.findTriggerOrAction(step.function);

    triggerOrAction.then(function(module){

        debug('Trigger or action %s found', step.function);

        var taskExec = new TaskExec();

        taskExec.onData = function (data){
            debug('Data received');
            var newMessage = {
                payload: data
            };
            amqpConnection.pushMessage(amqp.getOutgoingMessagesQueueName(), newMessage);
        };

        taskExec.onRebound = function(err){
            debug('Rebound received');
            amqpConnection.rebound(message, err);
        };

        taskExec.onError = function(err){
            debug('Error received');
            var errorMessage = {
                payload: err
            };
            amqpConnection.pushMessage(amqp.getErrorsQueueName(), errorMessage);
        };

        taskExec.onEnd = function(){
            amqpConnection.ack(message);
        };

        debug('Process message %j', message.content);
        taskExec.process(module, message, cfg);
    }).fail(function(err) {
        debug('Failed to find trigger or action ', step.function);
    });

}

function getStepInfo(taskId, stepId){
    return JSON.parse(process.env.STEP_INFO);
}

function getStepCfg(taskId, stepId){
    return {
        "customFilter" : "{\"Last_Date_Modified\":\">04142015\"}",
        "contactType" : "Person",
        "_account" : "552e7f8c76a1521344000001"
    };
}

exports.processMessage = processMessage;


