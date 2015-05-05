var ComponentReader = require('./component_reader.js').ComponentReader;
var mongo = require('./mongo.js');
var amqp = require('./amqp.js');
var TaskExec = require('./executor.js').TaskExec;
var debug = require('debug')('sailor');
var _ = require('lodash');

exports.Sailor = Sailor;

function Sailor(settings) {
    this.settings = settings;
    this.messagesCount = 0;
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

Sailor.prototype.disconnect = function disconnect() {
    var sailor = this;
    debug('Disconnecting, %s messages in processing', this.messagesCount);
    function disconnectMongo() {
        return sailor.mongoConnection.disconnect();
    }
    function disconnectRabbit() {
        return sailor.amqpConnection.disconnect();
    }
    return disconnectMongo().then(disconnectRabbit);
};

Sailor.prototype.run = function run() {
    debug('Start listening %s', this.settings.INCOMING_MESSAGES_QUEUE);
    return this.amqpConnection.listenQueue(this.settings.INCOMING_MESSAGES_QUEUE, this.processMessage.bind(this));
};

Sailor.prototype.getStepInfo = function getStepInfo(taskId, stepId) {
    return JSON.parse(this.settings.STEP_INFO);
};

Sailor.prototype.getStepConfiguration = function getStepConfiguration(taskId, stepId) {
    return JSON.parse(this.settings.STEP_DATA);
};

Sailor.prototype.processMessage = function processMessage(payload, message) {

    var sailor = this;

    sailor.messagesCount += 1;
    debug('Received a message, %s messages in processing', sailor.messagesCount);

    var headers = message.properties.headers;
    var taskId = headers.taskId;
    var stepId = headers.stepId;

    var step = sailor.getStepInfo(taskId, stepId);
    var cfg = sailor.getStepConfiguration(taskId, stepId);

    sailor.componentReader.loadTriggerOrAction(step.function).then(function processMessageWith(module) {

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
            sailor.messagesCount -= 1;
            debug('Processed a message, %s messages in processing', sailor.messagesCount);
        });

        return taskExec.process(module, payload, cfg);
    });
};