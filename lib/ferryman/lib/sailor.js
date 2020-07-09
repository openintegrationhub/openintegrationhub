/* eslint no-use-before-define: "off" */
const uuid = require('uuid');
const ComponentReader = require('./component_reader.js').ComponentReader;
const amqp = require('./amqp.js');
const TaskExec = require('./executor.js').TaskExec;
const log = require('./logging.js');
const _ = require('lodash');
const cipher = require('./cipher.js');
const hooksData = require('./hooksData');
const RestApiClient = require('elasticio-rest-node');
const assert = require('assert');

const pThrottle = require('p-throttle');

const AMQP_HEADER_META_PREFIX = 'x-eio-meta-';

function convertSettingsToCamelCase(settings) {
    return _.mapKeys(settings, (value, key) => _.camelCase(key));
}

function getAdditionalHeadersFromSettings(settings) {
    return convertSettingsToCamelCase(settings.additionalVars);
}

class Sailor {
    constructor(settings) {
        this.settings = settings;
        this.messagesCount = 0;
        this.amqpConnection = new amqp.Amqp(settings);
        this.componentReader = new ComponentReader();
        this.snapshot = {};
        this.stepData = {};
        this.shutdownCallback = null;
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

    async connect() {
        return this.amqpConnection.connect(this.settings.AMQP_URI);
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
        assert(stepData);

        Object.assign(this, {
            snapshot: stepData.snapshot || {},
            stepData
        });

        this.stepData = stepData;

        await componentReader.init(compPath);
    }

    async disconnect() {
        log.debug('Disconnecting, %s messages in processing', this.messagesCount);
        return this.amqpConnection.disconnect();
    }

    reportError(err) {
        const headers = Object.assign({}, getAdditionalHeadersFromSettings(this.settings), {
            execId: this.settings.EXEC_ID,
            taskId: this.settings.FLOW_ID,
            workspaceId: this.settings.WORKSPACE_ID,
            containerId: this.settings.CONTAINER_ID,
            userId: this.settings.USER_ID,
            stepId: this.settings.STEP_ID,
            compId: this.settings.COMP_ID,
            function: this.settings.FUNCTION
        });
        return this.amqpConnection.sendError(err, headers);
    }

    async startup() {
        log.debug('Starting up component');
        const result = await this.invokeModuleFunction('startup');
        log.trace('Startup data', { result });
        const handle = hooksData.startup(this.settings);
        try {
            const state = _.isEmpty(result) ? {} : result;
            await handle.create(state);
        } catch (e) {
            if (e.statusCode === 409) {
                log.warn('Startup data already exists. Rewriting.');
                await handle.delete();
                await handle.create(result);
            } else {
                log.warn('Component starting error');
                throw e;
            }
        }
        log.debug('Component started up');
        return result;
    }

    async runHookShutdown() {
        log.debug('About to shut down');
        const handle = hooksData.startup(this.settings);
        const state = await handle.retrieve();
        await this.invokeModuleFunction('shutdown', state);
        await handle.delete();
        log.debug('Shut down successfully');
    }

    async runHookInit() {
        log.debug('About to initialize component for execution');
        const res = await this.invokeModuleFunction('init');
        log.debug('Component execution initialized successfully');
        return res;
    }

    async invokeModuleFunction(moduleFunction, data) {
        const settings = this.settings;
        const stepData = this.stepData;
        const module = await this.componentReader.loadTriggerOrAction(settings.FUNCTION);
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
    }

    run() {
        const incomingQueue = this.settings.LISTEN_MESSAGES_ON;
        const handler = this.processMessageAndMaybeShutdownCallback.bind(this);
        log.debug('Start listening for messages on %s', incomingQueue);
        return this.amqpConnection.listenQueue(incomingQueue, handler);
    }

    async processMessageAndMaybeShutdownCallback(payload, message) {
        try {
            return await this.processMessage(payload, message);
        } catch (e) {
            log.error(e, 'Something very bad happened during message processing');
        } finally {
            if (this.shutdownCallback) {
                if (this.messagesCount === 0) {
                    // there is no another processMessage invocation, so it's time to call shutdownCallback
                    log.debug('About to invoke shutdownCallback');
                    this.shutdownCallback();
                    this.shutdownCallback = null;
                } else {
                    // there is another not finished processMessage invocation
                    log.debug('No shutdownCallback since messagesCount is not zero');
                }
            }
        }
    }

    async scheduleShutdown() {
        if (this.shutdownCallback) {
            log.debug('scheduleShutdown – shutdown is already scheduled, do nothing');
            return new Promise(resolve => this.shutdownCallback = resolve);
        }

        await this.amqpConnection.listenQueueCancel();
        if (this.messagesCount === 0) {
            // there is no unfinished processMessage invocation, let's just resolve scheduleShutdown now
            log.debug('scheduleShutdown – about to shutdown immediately');
            return;
        }
        // at least one processMessage invocation is not finished yet
        // let's return a Promise, which will be resolved by processMessageAndMaybeShutdownCallback
        log.debug('scheduleShutdown – shutdown is scheduled');
        return new Promise(resolve => this.shutdownCallback = resolve);
    }


    readIncomingMessageHeaders(message) {
        const { headers } = message.properties;

        // Get meta headers
        const metaHeaderNames = Object.keys(headers)
            .filter(key => key.toLowerCase().startsWith(AMQP_HEADER_META_PREFIX));

        const metaHeaders = _.pick(headers, metaHeaderNames);
        const metaHeadersLowerCased = _.mapKeys(metaHeaders, (value, key) => key.toLowerCase());

        const result = {
            stepId: headers.stepId, // the only use is passthrough mechanism
            ...metaHeadersLowerCased,
            threadId: headers.threadId || metaHeadersLowerCased['x-eio-meta-trace-id'],
            messageId: headers.messageId,
            parentMessageId: headers.parentMessageId
        };
        if (!result.threadId) {
            const threadId = uuid.v4();
            log.debug({ threadId }, 'Initiate new thread as it is not started ATM');
            result.threadId = threadId;
        }
        if (headers.reply_to) {
            result.reply_to = headers.reply_to;
        }
        return result;
    }

    async processMessage(payload, message) {
        //eslint-disable-next-line consistent-this
        const self = this;
        const settings = this.settings;
        const incomingMessageHeaders = this.readIncomingMessageHeaders(message);
        const origPassthrough = _.cloneDeep(payload.passthrough) || {};

        self.messagesCount += 1;

        const timeStart = Date.now();
        const { deliveryTag } = message.fields;

        const logger = log.child({
            threadId: incomingMessageHeaders.threadId || 'unknown',
            messageId: incomingMessageHeaders.messageId || 'unknown',
            parentMessageId: incomingMessageHeaders.parentMessageId || 'unknown',
            deliveryTag
        });

        logger.trace({ messagesCount: this.messagesCount }, 'processMessage received');

        const stepData = this.stepData;
        const cfg = _.cloneDeep(stepData.config) || {};
        const snapshot = _.cloneDeep(this.snapshot);

        log.debug('Trigger or action: %s', settings.FUNCTION);
        const outgoingMessageId = uuid.v4();
        const outgoingMessageHeaders = {
            ...incomingMessageHeaders,
            ...getAdditionalHeadersFromSettings(settings),
            parentMessageId: incomingMessageHeaders.messageId,
            threadId: incomingMessageHeaders.threadId,
            messageId: outgoingMessageId,
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
        };
        let module;
        try {
            module = await this.componentReader.loadTriggerOrAction(settings.FUNCTION);
        } catch (e) {
            log.error(e);
            outgoingMessageHeaders.end = new Date().getTime();
            self.amqpConnection.sendError(e, outgoingMessageHeaders, message);
            self.amqpConnection.reject(message);
            return;
        }
        return new Promise(resolve => {
            let endWasEmitted;


            const taskExec = new TaskExec({
                loggerOptions: _.pick(incomingMessageHeaders, ['threadId', 'messageId', 'parentMessageId']),
                variables: stepData.variables,
                services: {
                    apiClient: self.apiClient,
                    amqp: self.amqpConnection,
                    config: self.settings
                }
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
                headers.messageId = data.id || headers.messageId;
                logger.trace({
                    messagesCount: self.messagesCount,
                    messageProcessingTime: Date.now() - timeStart
                }, 'processMessage emit data');

                headers.end = new Date().getTime();

                if (stepData.is_passthrough === true) {
                    if (settings.NO_SELF_PASSTRHOUGH) {
                        const { stepId } = incomingMessageHeaders;
                        if (stepId) {
                            data.passthrough = Object.assign({}, origPassthrough, {
                                [stepId]: Object.assign({}, _.omit(payload, 'passthrough'))
                            });
                        }
                    } else {
                        data.passthrough = Object.assign({}, origPassthrough, {
                            [self.settings.STEP_ID]: Object.assign({}, _.omit(data, 'passthrough'))
                        });
                    }
                }

                try {
                    return await self.amqpConnection.sendData(data, headers, self.throttles.data);
                } catch (err) {
                    return onError(err);
                }
            }

            async function onHttpReply(reply) {
                const headers = _.clone(outgoingMessageHeaders);
                logger.trace({
                    messageProcessingTime: Date.now() - timeStart
                }, 'processMessage emit HttpReply');

                return self.amqpConnection.sendHttpReply(reply, headers);
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
                return self.amqpConnection.sendError(err, headers, message, self.throttles.error);
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
                return self.amqpConnection.sendRebound(err, message, headers);
            }

            async function onSnapshot(data) {
                const headers = _.clone(outgoingMessageHeaders);
                headers.snapshotEvent = 'snapshot';
                self.snapshot = data; //replacing `local` snapshot
                return self.amqpConnection.sendSnapshot(data, headers, self.throttles.snapshot);
            }

            async function onUpdateSnapshot(data) {
                const headers = _.clone(outgoingMessageHeaders);
                headers.snapshotEvent = 'updateSnapshot';

                if (_.isPlainObject(data)) {
                    if (data.$set) {
                        return log.warn('ERROR: $set is not supported any more in `updateSnapshot` event');
                    }
                    _.extend(self.snapshot, data); //updating `local` snapshot
                    return self.amqpConnection.sendSnapshot(data, headers);
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
                        messageProcessingTime: Date.now() - timeStart
                    }, 'processMessage emit end was called more than once');
                    return;
                }

                endWasEmitted = true;

                if (taskExec.errorCount > 0) {
                    self.amqpConnection.reject(message);
                } else {
                    self.amqpConnection.ack(message);
                }
                self.messagesCount -= 1;
                logger.trace({
                    messagesCount: self.messagesCount,
                    errorCount: taskExec.errorCount,
                    messageProcessingTime: Date.now() - timeStart
                }, 'processMessage emit end');

                resolve();
            }
        });


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
    }
}

exports.Sailor = Sailor;
