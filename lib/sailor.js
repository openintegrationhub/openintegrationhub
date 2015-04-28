var settings = require('./settings.js');
var ComponentReader = require('./component_reader.js').ComponentReader;
var mongo = require('./mongo.js');
var amqp = require('./amqp.js');
var TaskExec = require('./executor.js').TaskExec;
var Q = require('q');
var debug = require('debug')('sailor');

var Sailor = function() {
    this.mongoConnection = new mongo.MongoConnection();
    this.amqpConnection = new amqp.AMQPConnection();
    this.componentReader = new ComponentReader();
};

Sailor.prototype.connect = function connect(){

    var mongoConnected = this.mongoConnection.connect(settings.MONGO_URI);
    var amqpConnected = this.amqpConnection.connect(settings.AMQP_URI);
    var componentFound = this.componentReader.init(settings.COMPONENT_PATH);

    return Q.all([mongoConnected, amqpConnected, componentFound]);
};

Sailor.prototype.run = function run(){
    debug("Start listening %s", settings.INCOMING_MESSAGES_QUEUE.name);
    var sailor = this;
    sailor.amqpConnection.listenQueue(settings.INCOMING_MESSAGES_QUEUE.name, function(message, decryptedMessage){
        sailor.processMessage(message, decryptedMessage);
    });
};

Sailor.prototype.getStepInfo = function getStepInfo(taskId, stepId){
    return JSON.parse(process.env.STEP_INFO);
};

Sailor.prototype.getStepConfiguration = function getStepConfiguration(taskId, stepId){
    return {
        "customFilter" : "{\"Last_Date_Modified\":\">04142015\"}",
        "contactType" : "Person",
        "_account" : "552e7f8c76a1521344000001"
    };
};

Sailor.prototype.processMessage = function processMessage(message, decryptedMessage) {

    var sailor = this;

    var headers = message.properties.headers;
    var taskId = headers.taskId;
    var stepId = headers.stepId;

    var step = sailor.getStepInfo(taskId, stepId);
    var cfg = sailor.getStepConfiguration(taskId, stepId);

    return sailor.componentReader.findTriggerOrAction(step.function).then(function(module){

        debug('Process message');

        var taskExec = new TaskExec();
        taskExec.on("data", function(data) {
            sailor.amqpConnection.processData(data);
        });
        taskExec.on("error", function(err) {
            sailor.amqpConnection.processError(err);
        });
        taskExec.on("rebound", function(err) {
            sailor.amqpConnection.processRebound(message, err);
        });
        taskExec.on("end", function(err) {
            sailor.amqpConnection.ack(message);
        });

        return taskExec.process(module, message.content, cfg);
    });
};

exports.Sailor = Sailor;