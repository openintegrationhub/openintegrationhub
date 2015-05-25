var ComponentReader = require('./component_reader.js').ComponentReader;
var mongo = require('./mongo.js');
var amqp = require('./amqp.js');
var TaskExec = require('./executor.js').TaskExec;
var logging = require('./logging.js');
var info = logging.info;
var _ = require('lodash');
var Q = require('q');

exports.Sailor = Sailor;

function Sailor(settings) {
    this.settings = settings;
    this.messagesCount = 0;
    this.mongoConnection = new mongo.MongoConnection();
    this.amqpConnection = new amqp.AMQPConnection(settings);
    this.componentReader = new ComponentReader();
}

Sailor.prototype.connect = function connect() {
    return Q.all([
        this.componentReader.init(this.settings.COMPONENT_PATH),
        //this.mongoConnection.connect(this.settings.MONGO_URI),
        this.amqpConnection.connect(this.settings.AMQP_URI)
    ]);
};

Sailor.prototype.disconnect = function disconnect() {
    info('Disconnecting, %s messages in processing', this.messagesCount);
    return Q.all([
        //this.mongoConnection.disconnect(),
        this.amqpConnection.disconnect()
    ]);
};

Sailor.prototype.getStepCfg = function getStepCfg(stepId) {
    return this.settings.TASK.data[stepId];
};

Sailor.prototype.getStepInfo = function getStepInfo(stepId) {
    return _.find(this.settings.TASK.recipe.nodes, {"id": stepId});
};

Sailor.prototype.run = function run() {
    info('Start listening for messages on %s', this.settings.LISTEN_MESSAGES_ON);
    return this.amqpConnection.listenQueue(this.settings.LISTEN_MESSAGES_ON, this.processMessage.bind(this));
};

Sailor.prototype.readIncomingMessageHeaders = function readIncomingMessageHeaders(message) {

    var headers = message.properties.headers;

    if (!headers.execId) {
        throw new Error('ExecId is missing in message header');
    }
    if (!headers.taskId) {
        throw new Error('TaskId is missing in message header');
    }
    if (headers.taskId !== this.settings.TASK.id) {
        throw new Error('Message with wrong taskID arrived to the sailor');
    }

    return {
        taskId: headers.taskId,
        execId: headers.execId
    };
};

Sailor.prototype.processMessage = function processMessage(payload, message) {

    var sailor = this;

    sailor.messagesCount += 1;

    info('Message #%s received (%s messages in processing)', message.fields.deliveryTag, sailor.messagesCount);
    info('headers: %j', message.properties.headers);

    try {
        var incomingMessageHeaders = this.readIncomingMessageHeaders(message);
    } catch (err) {
        console.log("Invalid message headers: ", err);
        return sailor.amqpConnection.ack(message, false);
    }

    var stepInfo = sailor.getStepInfo(this.settings.STEP_ID);
    var cfg = sailor.getStepCfg(this.settings.STEP_ID);

    var outgoingMessageHeaders = {
        execId: incomingMessageHeaders.execId,
        taskId: incomingMessageHeaders.taskId,
        stepId: this.settings.STEP_ID,
        compId: stepInfo.compId,
        function: stepInfo.function,
        start: new Date().getTime()
    };

    info('Trigger or action: %s', stepInfo.function);

    return sailor.componentReader.loadTriggerOrAction(stepInfo.function).then(function processMessageWith(module) {

        var taskExec = new TaskExec();

        taskExec.on('data', function onData(data) {
            info('Message #%s data emitted', message.fields.deliveryTag);
            outgoingMessageHeaders.end = new Date().getTime();
            sailor.amqpConnection.sendData(data, message, outgoingMessageHeaders);
        });

        taskExec.on('error', function onError(err) {
            info('Message #%s error emitted (%s)', message.fields.deliveryTag, err.message);
            outgoingMessageHeaders.end = new Date().getTime();
            sailor.amqpConnection.sendError(err, message, outgoingMessageHeaders);
        });

        taskExec.on('rebound', function onRebound(err) {
            info('Message #%s rebound (%s)', message.fields.deliveryTag, err.message);
            outgoingMessageHeaders.end = new Date().getTime();
            outgoingMessageHeaders.reboundReason = err.message;
            sailor.amqpConnection.sendRebound(err, message, outgoingMessageHeaders);
        });

        taskExec.on('end', function onEnd() {
            sailor.amqpConnection.ack(message);
            sailor.messagesCount -= 1;
            info('Message #%s processed', message.fields.deliveryTag);
        });

        return taskExec.process(module, payload, cfg);
    }).done();
};

