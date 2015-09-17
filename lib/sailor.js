var ComponentReader = require('./component_reader.js').ComponentReader;
var amqp = require('./amqp.js');
var TaskExec = require('./executor.js').TaskExec;
var logging = require('./logging.js');
var info = logging.info;
var _ = require('lodash');
var Q = require('q');
var util = require('util');
var cipher = require('./cipher.js');
var ApiClient = require('./apiClient.js');

var TIMEOUT = process.env.TIMEOUT || 20 * 60 * 1000; // 20 minutes

exports.Sailor = Sailor;

function Sailor(settings) {
    this.settings = settings;
    this.messagesCount = 0;
    this.amqpConnection = new amqp.AMQPConnection(settings);
    this.componentReader = new ComponentReader();
    this.snapshot = this.getStepSnapshot();
    this.apiClient = new ApiClient(settings.API_URI).auth(settings.API_USERNAME, settings.API_KEY);
}

Sailor.prototype.connect = function connect() {
    return Q.all([
        this.componentReader.init(this.settings.COMPONENT_PATH),
        this.amqpConnection.connect(this.settings.AMQP_URI)
    ]);
};

Sailor.prototype.disconnect = function disconnect() {
    info('Disconnecting, %s messages in processing', this.messagesCount);
    return Q.all([
        this.amqpConnection.disconnect()
    ]);
};

Sailor.prototype.getStepCfg = function getStepCfg(stepId) {
    return _.cloneDeep(this.settings.TASK.data[stepId]) || {};
};

Sailor.prototype.getStepSnapshot = function getStepSnapshot() {
    var task = this.settings.TASK;
    var stepId = this.settings.STEP_ID;
    return _.get(task, ['snapshot', stepId]) ? task.snapshot[stepId] : {};
};

Sailor.prototype.getStepInfo = function getStepInfo(stepId) {
    return _.find(this.settings.TASK.recipe.nodes, {'id': stepId});
};

Sailor.prototype.run = function run() {
    var incomingQueue = this.settings.LISTEN_MESSAGES_ON;
    var processMessage = this.processMessage.bind(this);
    info('Start listening for messages on %s', incomingQueue);
    return this.amqpConnection.listenQueue(incomingQueue, processMessage);
};

Sailor.prototype.readIncomingMessageHeaders = function readIncomingMessageHeaders(message) {
    var headers = message.properties.headers;

    if (!headers.execId) {
        throw new Error('ExecId is missing in message header');
    }

    if (!headers.taskId) {
        throw new Error('TaskId is missing in message header');
    }

    if (!headers.userId) {
        throw new Error('UserId is missing in message header');
    }

    if (this.settings.TASK._id && headers.taskId !== this.settings.TASK._id) {
        throw new Error('Message with wrong taskID arrived to the sailor');
    }

    return {
        taskId: headers.taskId,
        execId: headers.execId,
        userId: headers.userId
    };
};

Sailor.prototype.processMessage = function processMessage(payload, message) {
    var sailor = this;
    var settings = this.settings;
    var stepId = settings.STEP_ID;

    sailor.messagesCount += 1;

    info('Message #%s received (%s messages in processing)', message.fields.deliveryTag, sailor.messagesCount);
    info('headers: %j', message.properties.headers);

    try {
        var incomingMessageHeaders = this.readIncomingMessageHeaders(message);
    } catch (err) {
        info("Invalid message headers: ", err);
        return sailor.amqpConnection.reject(message);
    }

    var stepInfo = sailor.getStepInfo(stepId);
    var cfg = sailor.getStepCfg(stepId);
    var snapshot = _.cloneDeep(sailor.snapshot);

    if (!stepInfo || !stepInfo.function) {
        info("Invalid trigger or action specification %j", stepInfo);
        return sailor.amqpConnection.reject(message);
    }

    info('Trigger or action: %s', stepInfo.function);

    var outgoingMessageHeaders = {
        execId: incomingMessageHeaders.execId,
        taskId: incomingMessageHeaders.taskId,
        userId: incomingMessageHeaders.userId,
        stepId: stepId,
        compId: stepInfo.compId,
        function: stepInfo.function,
        start: new Date().getTime(),
        cid: cipher.id
    };

    return sailor.componentReader.loadTriggerOrAction(stepInfo.function)
        .then(processMessageWithModule)
        .fail(onModuleNotFound)
        .done();

    function processMessageWithModule(module) {
        var deferred = Q.defer();
        var executionTimeout = setTimeout(onTimeout, TIMEOUT);

        function onTimeout() {
            info('Message execution stopped because of timeout');
            return onEnd();
        }

        var taskExec = new TaskExec();
        taskExec
            .on('data', onData)
            .on('error', onError)
            .on('rebound', onRebound)
            .on('snapshot', onSnapshot)
            .on('updateSnapshot', onUpdateSnapshot)
            .on('updateKeys', onUpdateKeys)
            .on('end', onEnd);

        taskExec.process(module, payload, cfg, snapshot);

        function onData(data) {
            var headers = _.clone(outgoingMessageHeaders);
            info('Message #%s data emitted', message.fields.deliveryTag);
            headers.end = new Date().getTime();
            sailor.amqpConnection.sendData(data, headers);
        }

        function onError(err) {
            var headers = _.clone(outgoingMessageHeaders);
            err = formatError(err);
            taskExec.errorCount++;
            info('Message #%s error emitted (%s)', message.fields.deliveryTag, err.message);
            headers.end = new Date().getTime();
            sailor.amqpConnection.sendError(err, headers, message.content);
        }

        function onRebound(err) {
            var headers = _.clone(outgoingMessageHeaders);
            err = formatError(err);
            info('Message #%s rebound (%s)', message.fields.deliveryTag, err.message);
            headers.end = new Date().getTime();
            headers.reboundReason = err.message;
            sailor.amqpConnection.sendRebound(err, message, headers);
        }

        function onSnapshot(data) {
            var headers = _.clone(outgoingMessageHeaders);
            headers.snapshotEvent = 'snapshot';
            sailor.amqpConnection.sendSnapshot(data, headers);
            sailor.snapshot = data; //replacing `local` snapshot
        }

        function onUpdateKeys(keys) {
            sailor.apiClient.updateKeys(cfg._account, keys)
                .fail(onError)
                .done();
        }

        function onUpdateSnapshot(data) {
            var headers = _.clone(outgoingMessageHeaders);
            headers.snapshotEvent = 'updateSnapshot';

            if (_.isPlainObject(data)) {
                if (data.$set) {
                    return console.error('ERROR: $set is not supported any more in `updateSnapshot` event');
                }
                _.extend(sailor.snapshot, data); //updating `local` snapshot
                sailor.amqpConnection.sendSnapshot(data, headers);
            } else {
                console.error('You should pass an object to the `updateSnapshot` event');
            }
        }

        function onEnd() {
            clearTimeout(executionTimeout);

            if (taskExec.errorCount > 0) {
                sailor.amqpConnection.reject(message);
            } else {
                sailor.amqpConnection.ack(message);
            }
            sailor.messagesCount -= 1;
            info('Message #%s processed', message.fields.deliveryTag);

            return deferred.resolve();
        }

        return deferred.promise;
    }

    function onModuleNotFound() {
        var err = new Error(util.format("Module %s not found", stepInfo.function));
        outgoingMessageHeaders.end = new Date().getTime();
        sailor.amqpConnection.sendError(err, outgoingMessageHeaders, message.content);
        sailor.amqpConnection.reject(message);
    }

    function formatError(err) {
        if (err instanceof Error || (_.isObject(err) && _.has(err, 'message'))) {
            return {
                message: err.message,
                stack: err.stack || 'Not Available',
                name: err.name || 'Error'
            };
        } else {
            return {
                message: err || 'Not Available',
                stack: 'Not Available',
                name: 'Error'
            };
        }
    }
};

