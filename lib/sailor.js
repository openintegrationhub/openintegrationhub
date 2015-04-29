var ComponentReader = require('./component_reader.js').ComponentReader;
var mongo = require('./mongo.js');
var amqp = require('./amqp.js');
var TaskExec = require('./executor.js').TaskExec;
var debug = require('debug')('sailor');

exports.Sailor = Sailor;

function Sailor(settings) {
    this.settings = settings;
    this.mongoConnection = new mongo.MongoConnection();
    this.amqpConnection = new amqp.AMQPConnection(settings);
    this.componentReader = new ComponentReader();
}

Sailor.prototype.connect = function connect() {
    var sailor = this;
    function findComponent() {
        return sailor.componentReader.init(sailor.settings.COMPONENT_PATH);
    }
    function connectMongo() {
        return sailor.mongoConnection.connect(sailor.settings.MONGO_URI);
    }
    function connectRabbit() {
        return sailor.amqpConnection.connect(sailor.settings.AMQP_URI);
    }
    return findComponent().then(connectMongo).then(connectRabbit);
};

Sailor.prototype.run = function run() {
    debug('Start listening %s', this.settings.INCOMING_MESSAGES_QUEUE.name);
    this.amqpConnection.listenQueue(sailor.settings.INCOMING_MESSAGES_QUEUE.name, this.processMessage.bind(this));
};

// @TODO define how do we get step information
// we need only 'function'
Sailor.prototype.getStepInfo = function getStepInfo(taskId, stepId) {
    return JSON.parse(process.env.STEP_INFO);
};

// @TODO define how do we get step configuration - mapping, accounts
Sailor.prototype.getStepConfiguration = function getStepConfiguration(taskId, stepId) {
    return {
        'customFilter' : '{\'Last_Date_Modified\':\'>04142015\'}',
        'contactType' : 'Person',
        '_account' : '552e7f8c76a1521344000001'
    };
};

Sailor.prototype.processMessage = function processMessage(payload, message) {

    var sailor = this;

    var headers = message.properties.headers;
    var taskId = headers.taskId;
    var stepId = headers.stepId;

    var step = sailor.getStepInfo(taskId, stepId);
    var cfg = sailor.getStepConfiguration(taskId, stepId);

    return sailor.componentReader.loadTriggerOrAction(step.function).then(function processMessageWith(module) {

        var taskExec = new TaskExec();
        taskExec.on('data', function onData(data) {
            sailor.amqpConnection.processData(data, message);
        });
        taskExec.on('error', function onError(err) {
            sailor.amqpConnection.processError(err, message);
        });
        taskExec.on('rebound', function onRebound(err) {
            sailor.amqpConnection.processRebound(err, message);
        });
        taskExec.on('end', function onEnd() {
            sailor.amqpConnection.ack(message);
        });

        return taskExec.process(module, payload, cfg);
    });
};