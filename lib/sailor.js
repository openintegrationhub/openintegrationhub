const ComponentReader = require('./component_reader.js').ComponentReader;
const amqp = require('./amqp.js');
const TaskExec = require('./executor.js').TaskExec;
const log = require('./logging.js');
const _ = require('lodash');
const Q = require('q');
const cipher = require('./cipher.js');
const hooksData = require('./hooksData');
const RestApiClient = require('elasticio-rest-node');
const assert = require('assert');
const co = require('co');
const uuid = require('uuid');
const pThrottle = require('p-throttle');

const TIMEOUT = process.env.ELASTICIO_TIMEOUT || 20 * 60 * 1000; // 20 minutes
const AMQP_HEADER_META_PREFIX = 'x-eio-meta-';

class Sailor {
    constructor(settings) {
        this.settings = settings;
        this.messagesCount = 0;
        this.amqpConnection = new amqp.Amqp(settings);
        this.componentReader = new ComponentReader();
        this.snapshot = {};
        this.stepData = {};
        //eslint-disable-next-line new-cap
        this.apiClient = RestApiClient(
            settings.API_USERNAME,
            settings.API_KEY,
            {
                retryCount: settings.API_REQUEST_RETRY_ATTEMPTS,
                retryDelay: settings.API_REQUEST_RETRY_DELAY
            });
        this.throttles = {
            // 100 Messages per Second
            data: pThrottle(() => Promise.resolve(true),
                settings.DATA_RATE_LIMIT,
                settings.RATE_INTERVAL),
            error: pThrottle(() => Promise.resolve(true),
                settings.ERROR_RATE_LIMIT,
                settings.RATE_INTERVAL),
            snapshot: pThrottle(() => Promise.resolve(true),
                settings.SNAPSHOT_RATE_LIMIT,
                settings.RATE_INTERVAL)
        };
    }

    connect() {
        return Promise.resolve(this.amqpConnection.connect(this.settings.AMQP_URI));
    }

    async prepare() {
        const {
            settings: {
                COMPONENT_PATH: compPath,
                FLOW_ID: flowId,
                STEP_ID: stepId
            },
            apiClient,
            componentReader
        } = this;

        const stepData = await apiClient.tasks.retrieveStep(flowId, stepId);
        log.debug('Received step data: %j', stepData);

        Object.assign(this, {
            snapshot: stepData.snapshot || {},
            stepData
        });

        this.stepData = stepData;

        await componentReader.init(compPath);
    }

    disconnect() {
        log.debug('Disconnecting, %s messages in processing', this.messagesCount);
        return Promise.resolve(this.amqpConnection.disconnect());
    }

    reportError(err) {
        const headers = {
            execId: this.settings.EXEC_ID,
            taskId: this.settings.FLOW_ID,
            workspaceId: this.settings.WORKSPACE_ID,
            containerId: this.settings.CONTAINER_ID,
            userId: this.settings.USER_ID,
            stepId: this.settings.STEP_ID,
            compId: this.settings.COMP_ID,
            function: this.settings.FUNCTION
        };
        const props = createDefaultAmqpProperties(headers);
        this.amqpConnection.sendError(err, props);
    }

    startup() {
        return co(function* doStartup() {
            log.debug('Starting up component');
            const result = yield this.invokeModuleFunction('startup');
            log.trace('Startup data', { result });
            const handle = hooksData.startup(this.settings);
            try {
                const state = _.isEmpty(result) ? {} : result;
                yield handle.create(state);
            } catch (e) {
                if (e.statusCode === 409) {
                    log.warn('Startup data already exists. Rewriting.');
                    yield handle.delete();
                    yield handle.create(result);
                } else {
                    log.warn('Component starting error');
                    throw e;
                }
            }
            log.debug('Component started up');
            return result;
        }.bind(this));
    }

    shutdown() {
        return co(function* doShutdown() {
            log.debug('About to shut down');
            const handle = hooksData.startup(this.settings);
            const state = yield handle.retrieve();
            yield this.invokeModuleFunction('shutdown', state);
            yield handle.delete();
            log.debug('Shut down successfully');
        }.bind(this));
    }

    init() {
        return co(function* doInit() {
            log.debug('About to initialize component for execution');
            const res = yield this.invokeModuleFunction('init');
            log.debug('Component execution initialized successfully');
            return res;
        }.bind(this));
    }

    invokeModuleFunction(moduleFunction, data) {
        const settings = this.settings;
        const stepData = this.stepData;
        return co(function* gen() {
            const module = yield this.componentReader.loadTriggerOrAction(settings.FUNCTION);
            if (!module[moduleFunction]) {
                log.warn(`invokeModuleFunction – ${moduleFunction} is not found`);
                return Promise.resolve();
            }
            const cfg = _.cloneDeep(stepData.config) || {};
            return new Promise((resolve, reject) => {
                try {
                    resolve(module[moduleFunction](cfg, data));
                } catch (e) {
                    reject(e);
                }
            });
        }.bind(this));
    }

    run() {
        const incomingQueue = this.settings.LISTEN_MESSAGES_ON;
        const processMessage = this.processMessage.bind(this);
        log.debug('Start listening for messages on %s', incomingQueue);
        return this.amqpConnection.listenQueue(incomingQueue, processMessage);
    }

    readIncomingMessageHeaders(message) {
        const { settings } = this;
        const { headers } = message.properties;

        assert(headers.execId, 'ExecId is missing in message header');
        assert(headers.taskId, 'TaskId is missing in message header');
        assert(headers.userId, 'UserId is missing in message header');
        assert(headers.taskId === settings.FLOW_ID, 'Message with wrong taskID arrived to the sailor');

        const metaHeaderNames = Object.keys(headers)
            .filter(key => key.toLowerCase().startsWith(AMQP_HEADER_META_PREFIX));

        const metaHeaders = _.pick(headers, metaHeaderNames);
        const metaHeadersLowerCased = _.mapKeys(metaHeaders, (value, key) => key.toLowerCase());

        let result = _.pick(headers, ['taskId', 'execId', 'workspaceId', 'containerId', 'userId', 'stepId', 'compId']);
        result = _.extend(result, metaHeadersLowerCased);

        result.threadId = headers.threadId || headers['x-eio-meta-trace-id'];

        if (headers.messageId) {
            result.parentMessageId = headers.messageId;
        }

        if (headers.reply_to) {
            result.reply_to = headers.reply_to;
        }

        return result;
    }

    processMessage(payload, message) {
        //eslint-disable-next-line consistent-this
        const self = this;
        const settings = this.settings;
        let incomingMessageHeaders;
        const origPassthrough = _.cloneDeep(payload.passthrough) || {};

        self.messagesCount += 1;

        const timeStart = Date.now();

        const { headers } = message.properties;
        const { deliveryTag } = message.fields;

        const threadId = headers.threadId || headers['x-eio-meta-trace-id'] || 'unknown';
        const messageId = headers.messageId || 'unknown';
        const parentMessageId = headers.parentMessageId || 'unknown';

        const logger = log.child({
            threadId,
            messageId,
            parentMessageId,
            deliveryTag
        });

        logger.trace({
            messagesCount: self.messagesCount,
            messageProcessingTime: Date.now() - timeStart
        }, 'processMessage received');

        try {
            incomingMessageHeaders = this.readIncomingMessageHeaders(message);
        } catch (err) {
            log.error(err, 'Invalid message headers');
            return self.amqpConnection.reject(message);
        }

        const stepData = self.stepData;
        if (!stepData) {
            log.warn('Invalid trigger or action specification %j', stepData);
            return self.amqpConnection.reject(message);
        }
        const cfg = _.cloneDeep(stepData.config) || {};
        const snapshot = _.cloneDeep(self.snapshot);

        log.debug('Trigger or action: %s', settings.FUNCTION);

        let outgoingMessageHeaders = _.clone(incomingMessageHeaders);

        outgoingMessageHeaders = _.extend(outgoingMessageHeaders, {
            execId: settings.EXEC_ID,
            taskId: settings.FLOW_ID,
            workspaceId: settings.WORKSPACE_ID,
            containerId: settings.CONTAINER_ID,
            userId: settings.USER_ID,
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
            let endWasEmitted;

            function onTimeout() {
                logger.trace({
                    messagesCount: self.messagesCount,
                    messageProcessingTime: Date.now() - timeStart
                }, 'processMessage timeout');
                return onEnd();
            }

            function promise(p) {
                subPromises.push(p);
                return p;
            }

            const taskExec = new TaskExec({
                loggerOptions: {
                    threadId,
                    messageId,
                    parentMessageId
                },
                variables: stepData.variables
            });

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

            async function onData(data) {
                const headers = _.clone(outgoingMessageHeaders);
                logger.trace({
                    messagesCount: self.messagesCount,
                    messageProcessingTime: Date.now() - timeStart
                }, 'processMessage emit data');

                headers.end = new Date().getTime();
                const props = createAmqpProperties(headers, data.id);

                if (stepData.is_passthrough === true) {
                    const passthrough = Object.assign({}, _.omit(data, 'passthrough'));

                    data.passthrough = Object.assign({}, origPassthrough, {
                        [self.settings.STEP_ID]: passthrough
                    });
                }

                return self.amqpConnection.sendData(data, props, self.throttles.data);
            }

            async function onHttpReply(reply) {
                const headers = _.clone(outgoingMessageHeaders);
                const props = createAmqpProperties(headers);
                logger.trace({
                    messageProcessingTime: Date.now() - timeStart
                }, 'processMessage emit HttpReply');

                return self.amqpConnection.sendHttpReply(reply, props);
            }

            async function onError(err) {
                const headers = _.clone(outgoingMessageHeaders);
                err = formatError(err);
                taskExec.errorCount++;
                logger.trace({
                    err,
                    messagesCount: self.messagesCount,
                    messageProcessingTime: Date.now() - timeStart
                }, 'processMessage emit error');
                headers.end = new Date().getTime();
                const props = createAmqpProperties(headers);
                return self.amqpConnection.sendError(err, props, message.content, self.throttles.error);
            }

            async function onRebound(err) {
                const headers = _.clone(outgoingMessageHeaders);
                err = formatError(err);
                logger.trace({
                    err,
                    messagesCount: self.messagesCount,
                    messageProcessingTime: Date.now() - timeStart
                }, 'processMessage emit rebound');
                headers.end = new Date().getTime();
                headers.reboundReason = err.message;
                const props = createAmqpProperties(headers);
                return self.amqpConnection.sendRebound(err, message, props);
            }

            async function onSnapshot(data) {
                const headers = _.clone(outgoingMessageHeaders);
                headers.snapshotEvent = 'snapshot';
                self.snapshot = data; //replacing `local` snapshot
                const props = createAmqpProperties(headers);
                return self.amqpConnection.sendSnapshot(data, props, self.throttles.snapshot);
            }

            async function onUpdateSnapshot(data) {
                const headers = _.clone(outgoingMessageHeaders);
                headers.snapshotEvent = 'updateSnapshot';

                if (_.isPlainObject(data)) {
                    if (data.$set) {
                        return log.warn('ERROR: $set is not supported any more in `updateSnapshot` event');
                    }
                    _.extend(self.snapshot, data); //updating `local` snapshot
                    const props = createAmqpProperties(headers);
                    return self.amqpConnection.sendSnapshot(data, props);
                } else {
                    log.error('You should pass an object to the `updateSnapshot` event');
                }
            }

            async function onUpdateKeys(keys) {
                logger.trace({
                    messageProcessingTime: Date.now() - timeStart
                }, 'processMessage emit updateKeys');

                try {
                    await self.apiClient.accounts.update(cfg._account, { keys: keys });
                    logger.debug('Successfully updated keys #%s', deliveryTag);
                } catch (error) {
                    logger.error('Failed to updated keys #%s', deliveryTag);
                    await onError(error);
                }
            }

            function onEnd() {
                if (endWasEmitted) {
                    logger.warn({
                        messagesCount: self.messagesCount,
                        errorCount: taskExec.errorCount,
                        promises: subPromises.length,
                        messageProcessingTime: Date.now() - timeStart
                    }, 'processMessage emit end was called more than once');
                    return;
                }

                endWasEmitted = true;

                clearTimeout(executionTimeout);

                if (taskExec.errorCount > 0) {
                    self.amqpConnection.reject(message);
                } else {
                    self.amqpConnection.ack(message);
                }
                self.messagesCount -= 1;
                logger.trace({
                    messagesCount: self.messagesCount,
                    errorCount: taskExec.errorCount,
                    promises: subPromises.length,
                    messageProcessingTime: Date.now() - timeStart
                }, 'processMessage emit end');

                Q.allSettled(subPromises).then(resolveDeferred);
            }

            function resolveDeferred() {
                deferred.resolve();
            }

            return deferred.promise;
        }

        function onModuleNotFound(err) {
            log.error(err);
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
            headers.messageId = messageId || uuid.v4();

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
