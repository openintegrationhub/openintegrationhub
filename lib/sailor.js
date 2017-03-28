const ComponentReader = require('./component_reader.js').ComponentReader;
const amqp = require('./amqp.js');
const TaskExec = require('./executor.js').TaskExec;
const logging = require('./logging.js');
const info = logging.info;
const _ = require('lodash');
const Q = require('q');
const cipher = require('./cipher.js');
const RestApiClient = require('elasticio-rest-node');
const assert = require('assert');
const co = require('co');
const uuid = require('uuid');

const TIMEOUT = process.env.ELASTICIO_TIMEOUT || 20 * 60 * 1000; // 20 minutes
const AMQP_HEADER_META_PREFIX = 'x-eio-meta-';
const AMQP_HEADER_TRACE_ID = AMQP_HEADER_META_PREFIX + 'trace-id';

class Sailor {
    constructor(settings) {
        this.settings = settings;
        this.messagesCount = 0;
        this.amqpConnection = new amqp.Amqp(settings);
        this.componentReader = new ComponentReader();
        this.snapshot = {};
        this.stepData = {};
        this.apiClient = RestApiClient(settings.API_USERNAME, settings.API_KEY);
    }

    connect() {
        return Promise.resolve(this.amqpConnection.connect(this.settings.AMQP_URI));
    }

    prepare() {
        return co(function* doPrepare() {
            const taskId = this.settings.FLOW_ID;
            const stepId = this.settings.STEP_ID;
            const stepData = yield this.apiClient.tasks.retrieveStep(taskId, stepId);
            info('Received step data: %j', stepData);
            this.snapshot = stepData.snapshot || {};
            this.stepData = stepData;

            yield this.componentReader.init(this.settings.COMPONENT_PATH);
        }.bind(this));
    }

    disconnect() {
        info('Disconnecting, %s messages in processing', this.messagesCount);
        return Promise.resolve(this.amqpConnection.disconnect());
    }

    reportError(err) {
        const headers = {
            execId: process.env.ELASTICIO_EXEC_ID,
            taskId: process.env.ELASTICIO_FLOW_ID,
            userId: process.env.ELASTICIO_USER_ID
        };
        const props = createDefaultAmqpProperties(headers);
        this.amqpConnection.sendError(err, props);
    }

    startup() {
        return co(function* doStartup() {
            console.log('Starting up component');
            const result = yield this.invokeModuleFunction('startup');
            //TODO: persist it
            return result;
        }.bind(this));
    }

    shutdown() {
        return co(function* doShutdown() {
            console.log('Shutting down component');
            return yield this.invokeModuleFunction('shutdown');
        }.bind(this));
    }

    init() {
        return co(function* doInit() {
            console.log('Initializing component for execution');
            return yield this.invokeModuleFunction('init');
        }.bind(this));
    }

    invokeModuleFunction(moduleFunction) {
        const settings = this.settings;
        const stepData = this.stepData;
        return co(function* gen() {
            const module = yield this.componentReader.loadTriggerOrAction(settings.FUNCTION);
            if (!module[moduleFunction]) {
                return Promise.resolve();
            }
            const cfg = _.cloneDeep(stepData.config) || {};
            return new Promise((resolve, reject) => {
                try {
                    resolve(module[moduleFunction](cfg));
                } catch (e) {
                    reject(e);
                }
            });
        }.bind(this));
    }

    run() {
        const incomingQueue = this.settings.LISTEN_MESSAGES_ON;
        const processMessage = this.processMessage.bind(this);
        info('Start listening for messages on %s', incomingQueue);
        return this.amqpConnection.listenQueue(incomingQueue, processMessage);
    }

    readIncomingMessageHeaders(message) {
        const props = message.properties;
        const headers = props.headers;
        const settings = this.settings;

        assert(headers.execId, 'ExecId is missing in message header');
        assert(headers.taskId, 'TaskId is missing in message header');
        assert(headers.userId, 'UserId is missing in message header');
        assert(headers.taskId === settings.FLOW_ID, 'Message with wrong taskID arrived to the sailor');


        const metaHeaderNames = Object.keys(headers)
            .filter(key => key.toLowerCase().startsWith(AMQP_HEADER_META_PREFIX));

        const metaHeaders = _.pick(headers, metaHeaderNames);

        const metaHeadersLowerCased = _.mapKeys(metaHeaders, (value, key) => key.toLowerCase());

        let result = _.pick(headers, ['taskId', 'execId', 'userId']);
        result = _.extend(result, metaHeadersLowerCased);

        if (headers.messageId) {
            result.parentMessageId = headers.messageId;
        }

        if (headers.reply_to) {
            result.reply_to = headers.reply_to;
        }

        return result;
    }

    processMessage(payload, message) {
        const self = this;
        const settings = this.settings;
        let incomingMessageHeaders;
        const origPassthrough = _.cloneDeep(payload.passthrough) || {};

        self.messagesCount += 1;

        const traceId = message.properties.headers[AMQP_HEADER_TRACE_ID] || 'unknown';
        const messageId = message.properties.headers.messageId || 'unknown';
        const parentMessageId = message.properties.headers.parentMessageId || 'unknown';
        info('Message received: deliveryTag=%s, messageId=%s, parentMessageId=%s, traceId=%s',
            message.fields.deliveryTag,messageId, parentMessageId, traceId);
        info('%s messages processing in total',  self.messagesCount);

        try {
            incomingMessageHeaders = this.readIncomingMessageHeaders(message);
        } catch (err) {
            console.error('Invalid message headers:', err.stack);
            return self.amqpConnection.reject(message);
        }

        const stepData = self.stepData;
        if (!stepData) {
            info('Invalid trigger or action specification %j', stepData);
            return self.amqpConnection.reject(message);
        }
        const cfg = _.cloneDeep(stepData.config) || {};
        const snapshot = _.cloneDeep(self.snapshot);

        info('Trigger or action: %s', settings.FUNCTION);

        let outgoingMessageHeaders = _.clone(incomingMessageHeaders);

        outgoingMessageHeaders = _.extend(outgoingMessageHeaders, {
            stepId: settings.STEP_ID,
            compId: settings.COMP_ID,
            function: settings.FUNCTION,
            start: new Date().getTime(),
            cid: cipher.id
        });

        return co(function* doProcess() {
            const module = yield this.componentReader.loadTriggerOrAction(settings.FUNCTION);
            return processMessageWithModule(module);
        }.bind(this)).catch(onModuleNotFound);

        function processMessageWithModule(module) {
            const deferred = Q.defer();
            const executionTimeout = setTimeout(onTimeout, TIMEOUT);
            const subPromises = [];

            function onTimeout() {
                info('Message execution stopped because of timeout');
                return onEnd();
            }

            function promise(p) {
                subPromises.push(p);
                return p;
            }

            const taskExec = new TaskExec();
            taskExec
                .on('data', onData)
                .on('error', onError)
                .on('rebound', onRebound)
                .on('snapshot', onSnapshot)
                .on('updateSnapshot', onUpdateSnapshot)
                .on('updateKeys', onUpdateKeys)
                .on('httpReply', onHttpReply)
                .on('end', onEnd);

            taskExec.process(module, payload, cfg, snapshot);

            function onData(data) {
                const headers = _.clone(outgoingMessageHeaders);
                info('Message #%s data emitted', message.fields.deliveryTag);
                headers.end = new Date().getTime();
                const props = createAmqpProperties(headers, data.id);

                if (stepData.is_passthrough === true) {
                    const passthrough = Object.assign({}, _.omit(data, 'passthrough'));

                    data.passthrough = Object.assign({}, origPassthrough, {
                        [self.settings.STEP_ID]: passthrough
                    });
                }

                return promise(self.amqpConnection.sendData(data, props));
            }

            function onHttpReply(reply) {
                const headers = _.clone(outgoingMessageHeaders);
                const props = createAmqpProperties(headers);
                info('HttpReply message emitted for incoming msg=#%s', message.fields.deliveryTag);
                return promise(self.amqpConnection.sendHttpReply(reply, props));
            }

            function onError(err) {
                const headers = _.clone(outgoingMessageHeaders);
                err = formatError(err);
                taskExec.errorCount++;
                info('Message #%s error emitted (%s)', message.fields.deliveryTag, err.message);
                headers.end = new Date().getTime();
                const props = createAmqpProperties(headers);
                return promise(self.amqpConnection.sendError(err, props, message.content));
            }

            function onRebound(err) {
                const headers = _.clone(outgoingMessageHeaders);
                err = formatError(err);
                info('Message #%s rebound (%s)', message.fields.deliveryTag, err.message);
                headers.end = new Date().getTime();
                headers.reboundReason = err.message;
                const props = createAmqpProperties(headers);
                return promise(self.amqpConnection.sendRebound(err, message, props));
            }

            function onSnapshot(data) {
                const headers = _.clone(outgoingMessageHeaders);
                headers.snapshotEvent = 'snapshot';
                self.snapshot = data; //replacing `local` snapshot
                const props = createAmqpProperties(headers);
                return promise(self.amqpConnection.sendSnapshot(data, props));
            }

            function onUpdateSnapshot(data) {
                const headers = _.clone(outgoingMessageHeaders);
                headers.snapshotEvent = 'updateSnapshot';

                if (_.isPlainObject(data)) {
                    if (data.$set) {
                        return console.error('ERROR: $set is not supported any more in `updateSnapshot` event');
                    }
                    _.extend(self.snapshot, data); //updating `local` snapshot
                    const props = createAmqpProperties(headers);
                    self.amqpConnection.sendSnapshot(data, props);
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

        function createAmqpProperties(headers, messageId) {

            headers.messageId =  messageId? messageId: uuid.v4();

            return createDefaultAmqpProperties(headers);
        }
    }
}

function createDefaultAmqpProperties(headers) {

    const result = {
        contentType: 'application/json',
        contentEncoding: 'utf8',
        mandatory: true,
        headers: headers
    };

    return result;
}

exports.Sailor = Sailor;

