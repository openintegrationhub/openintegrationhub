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
        this.mongoConnection.connect(this.settings.MONGO_URI),
        this.amqpConnection.connect(this.settings.AMQP_URI)
    ]);
};

Sailor.prototype.disconnect = function disconnect() {
    info('Disconnecting, %s messages in processing', this.messagesCount);
    return Q.all([
        this.mongoConnection.disconnect(),
        this.amqpConnection.disconnect()
    ]);
};

Sailor.prototype.getStepCfg = function getStepCfg(taskId, stepId) {
    return this.settings.TASK.data[this.settings.STEP_ID];
};

Sailor.prototype.getStepInfo = function getStepInfo(taskId, stepId) {
    return _.find(this.settings.TASK.recipe.nodes, {"id": this.settings.STEP_ID});
};

Sailor.prototype.run = function run() {
    info('Start listening for messages on %s', this.settings.LISTEN_MESSAGES_ON);
    return this.amqpConnection.listenQueue(this.settings.LISTEN_MESSAGES_ON, this.processMessage.bind(this));
};

Sailor.prototype.processMessage = function processMessage(payload, message) {

    var sailor = this;

    sailor.messagesCount += 1;

    info('Message #%s received (%s messages in processing)', message.fields.deliveryTag, sailor.messagesCount);
    info('headers: %j', message.properties.headers);

    var headers = message.properties.headers;
    var taskId = headers.taskId; // currently ignored, we get TASK from .env
    var stepId = headers.stepId; // currently ignored, we get STEP_ID from .env

    var step = sailor.getStepInfo(taskId, stepId);
    var cfg = sailor.getStepCfg(taskId, stepId);

    info('Trigger or action: %s', step.function);

    return sailor.componentReader.loadTriggerOrAction(step.function).then(function processMessageWith(module) {

        var taskExec = new TaskExec();

        taskExec.on('data', function onData(data) {
            info('Message #%s data emitted', message.fields.deliveryTag);
            sailor.amqpConnection.sendData(data, message);
        });

        taskExec.on('error', function onError(err) {
            info('Message #%s error emitted (%s)', message.fields.deliveryTag, err.message);
            sailor.amqpConnection.sendError(err, message);
        });

        taskExec.on('rebound', function onRebound(err) {
            info('Message #%s rebound (%s)', message.fields.deliveryTag, err.message);
            sailor.amqpConnection.sendRebound(err, message);
        });

        taskExec.on('end', function onEnd() {
            sailor.amqpConnection.ack(message);
            sailor.messagesCount -= 1;
            info('Message #%s processed', message.fields.deliveryTag);
        });

        return taskExec.process(module, payload, cfg);
    }).done();
};

