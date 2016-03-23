var ComponentReader = require('./component_reader.js').ComponentReader;
var amqp = require('./amqp.js');
var TaskExec = require('./executor.js').TaskExec;
var logging = require('./logging.js');
var info = logging.info;
var _ = require('lodash');
var Q = require('q');
var cipher = require('./cipher.js');
var RestApiClient = require('elasticio-rest-node');
var assert = require('assert');

var TIMEOUT = process.env.ELASTICIO_TIMEOUT || 20 * 60 * 1000; // 20 minutes

exports.Sailor = Sailor;

function Sailor(settings) {
    this.settings = settings;
    this.messagesCount = 0;
    this.amqpConnection = new amqp.AMQPConnection(settings);
    this.componentReader = new ComponentReader();
    this.snapshot = {};
    this.stepData = {};
    this.apiClient = RestApiClient(settings.API_USERNAME, settings.API_KEY);
}

Sailor.prototype.connect = function connect() {
    var self = this;

    function getStepData() {
        function setStepsData(data) {
            info('Received step data: %j', data);
            self.snapshot = data.snapshot || {};
            self.stepData = data;
        }

        var taskId = self.settings.TASK_ID;
        var stepId = self.settings.STEP_ID;

        return self.apiClient.tasks.retrieveStep(taskId, stepId).then(setStepsData);
    }

    return Q.all([
        getStepData(),
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

Sailor.prototype.run = function run() {
    var incomingQueue = this.settings.LISTEN_MESSAGES_ON;
    var processMessage = this.processMessage.bind(this);
    info('Start listening for messages on %s', incomingQueue);
    return this.amqpConnection.listenQueue(incomingQueue, processMessage);
};

Sailor.prototype.readIncomingMessageHeaders = function readIncomingMessageHeaders(message) {
    var headers = message.properties.headers;
    var settings = this.settings;

    assert(headers.execId, 'ExecId is missing in message header');
    assert(headers.taskId, 'TaskId is missing in message header');
    assert(headers.userId, 'UserId is missing in message header');
    assert(headers.taskId === settings.TASK_ID, 'Message with wrong taskID arrived to the sailor');

    return {
        taskId: headers.taskId,
        execId: headers.execId,
        userId: headers.userId
    };
};

Sailor.prototype.processMessage = function processMessage(payload, message) {
    var self = this;
    var settings = this.settings;
    var incomingMessageHeaders;

    self.messagesCount += 1;

    info('Message #%s received (%s messages in processing)', message.fields.deliveryTag, self.messagesCount);
    info('headers: %j', message.properties.headers);

    try {
        incomingMessageHeaders = this.readIncomingMessageHeaders(message);
    } catch (err) {
        console.error('Invalid message headers:', err.stack);
        return self.amqpConnection.reject(message);
    }

    var stepData = self.stepData;
    if (!stepData) {
        info('Invalid trigger or action specification %j', stepData);
        return self.amqpConnection.reject(message);
    }

    var cfg = _.cloneDeep(stepData.config) || {};
    var snapshot = _.cloneDeep(self.snapshot);

    info('Trigger or action: %s', settings.FUNCTION);

    var outgoingMessageHeaders = {
        execId: incomingMessageHeaders.execId,
        taskId: incomingMessageHeaders.taskId,
        userId: incomingMessageHeaders.userId,
        stepId: settings.STEP_ID,
        compId: settings.COMP_ID,
        function: settings.FUNCTION,
        start: new Date().getTime(),
        cid: cipher.id
    };

    return self.componentReader.loadTriggerOrAction(settings.FUNCTION)
        .then(processMessageWithModule)
        .fail(onModuleNotFound);

    function processMessageWithModule(module) {
        var deferred = Q.defer();
        var executionTimeout = setTimeout(onTimeout, TIMEOUT);
        var subPromises = [];

        function onTimeout() {
            info('Message execution stopped because of timeout');
            return onEnd();
        }

        function promise(p) {
            subPromises.push(p);
            return p;
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
            return promise(self.amqpConnection.sendData(data, headers));
        }

        function onError(err) {
            var headers = _.clone(outgoingMessageHeaders);
            err = formatError(err);
            taskExec.errorCount++;
            info('Message #%s error emitted (%s)', message.fields.deliveryTag, err.message);
            headers.end = new Date().getTime();
            return promise(self.amqpConnection.sendError(err, headers, message.content));
        }

        function onRebound(err) {
            var headers = _.clone(outgoingMessageHeaders);
            err = formatError(err);
            info('Message #%s rebound (%s)', message.fields.deliveryTag, err.message);
            headers.end = new Date().getTime();
            headers.reboundReason = err.message;
            return promise(self.amqpConnection.sendRebound(err, message, headers));
        }

        function onSnapshot(data) {
            var headers = _.clone(outgoingMessageHeaders);
            headers.snapshotEvent = 'snapshot';
            self.snapshot = data; //replacing `local` snapshot
            return promise(self.amqpConnection.sendSnapshot(data, headers));
        }

        function onUpdateSnapshot(data) {
            var headers = _.clone(outgoingMessageHeaders);
            headers.snapshotEvent = 'updateSnapshot';

            if (_.isPlainObject(data)) {
                if (data.$set) {
                    return console.error('ERROR: $set is not supported any more in `updateSnapshot` event');
                }
                _.extend(self.snapshot, data); //updating `local` snapshot
                self.amqpConnection.sendSnapshot(data, headers);
            } else {
                console.error('You should pass an object to the `updateSnapshot` event');
            }
        }

        function onUpdateKeys(keys) {
            info('Message #%s updateKeys emitted', message.fields.deliveryTag);

            return promise(self.apiClient.accounts.update(cfg._account, {keys: keys})
                .then(onKeysUpdateSuccess)
                .fail(onKeysUpdateError));

            function onKeysUpdateSuccess() {
                info('Successfully updated keys #%s', message.fields.deliveryTag);
            }

            function onKeysUpdateError(err) {
                info('Failed to updated keys #%s', message.fields.deliveryTag);
                return onError(err);
            }
        }

        function onEnd() {
            clearTimeout(executionTimeout);

            if (taskExec.errorCount > 0) {
                self.amqpConnection.reject(message);
            } else {
                self.amqpConnection.ack(message);
            }
            self.messagesCount -= 1;
            info(
                'Message #%s processed, %s promises to wait & finish',
                message.fields.deliveryTag,
                subPromises.length
            );
            Q.allSettled(subPromises).then(resolveDeferred);
        }

        function resolveDeferred() {
            deferred.resolve();
        }

        return deferred.promise;
    }

    function onModuleNotFound(err) {
        console.error(err.stack);
        outgoingMessageHeaders.end = new Date().getTime();
        self.amqpConnection.sendError(err, outgoingMessageHeaders, message.content);
        self.amqpConnection.reject(message);
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

