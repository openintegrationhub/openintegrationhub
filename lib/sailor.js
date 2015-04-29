var ComponentReader = require('./component_reader.js').ComponentReader;
var mongo = require('./mongo.js');
var amqp = require('./amqp.js');
var TaskExec = require('./executor.js').TaskExec;
var Q = require('q');
var debug = require('debug')('sailor');

var Sailor = function(settings) {
    this.settings = settings;
    this.mongoConnection = new mongo.MongoConnection();
    this.amqpConnection = new amqp.AMQPConnection(settings);
    this.componentReader = new ComponentReader();
};

Sailor.prototype.connect = function connect(){
    var sailor = this;
    function findComponent(){
        return sailor.componentReader.init(sailor.settings.COMPONENT_PATH);
    }
    function connectMongo(){
        return sailor.mongoConnection.connect(sailor.settings.MONGO_URI);
    }
    function connectRabbit(){
        return sailor.amqpConnection.connect(sailor.settings.AMQP_URI);
    }
    return findComponent().then(connectMongo).then(connectRabbit);
};

Sailor.prototype.run = function run(){
    debug("Start listening %s", this.settings.INCOMING_MESSAGES_QUEUE.name);
    var sailor = this;
    sailor.amqpConnection.listenQueue(sailor.settings.INCOMING_MESSAGES_QUEUE.name, function(payload, originalMessage){
        sailor.processMessage(payload, originalMessage);
    });
};

// @TODO define how do we get step information
// we need only "function"
Sailor.prototype.getStepInfo = function getStepInfo(taskId, stepId){
    return JSON.parse(process.env.STEP_INFO);
};

// @TODO define how do we get step configuration - mapping, accounts
Sailor.prototype.getStepConfiguration = function getStepConfiguration(taskId, stepId){
    return {
        "customFilter" : "{\"Last_Date_Modified\":\">04142015\"}",
        "contactType" : "Person",
        "_account" : "552e7f8c76a1521344000001"
    };
};

Sailor.prototype.processMessage = function processMessage(payload, message) {

    var sailor = this;

    var headers = message.properties.headers;
    var taskId = headers.taskId;
    var stepId = headers.stepId;

    var step = sailor.getStepInfo(taskId, stepId);
    var cfg = sailor.getStepConfiguration(taskId, stepId);

    return sailor.componentReader.loadTriggerOrAction(step.function).then(function(module){

        var taskExec = new TaskExec();
        taskExec.on("data", function(data) {
            sailor.amqpConnection.processData(data, message);
        });
        taskExec.on("error", function(err) {
            sailor.amqpConnection.processError(err, message);
        });
        taskExec.on("rebound", function(err) {
            sailor.amqpConnection.processRebound(err, message);
        });
        taskExec.on("end", function() {
            sailor.amqpConnection.ack(message);
        });

        return taskExec.process(module, payload, cfg);
    });
};

exports.Sailor = Sailor;