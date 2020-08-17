
/* eslint no-use-before-define: 0 */ // --> OFF

const uuid = require('uuid');
const _ = require('lodash');
const RestApiClient = require('elasticio-rest-node');
// const assert = require('assert');
const co = require('co');
const pThrottle = require('p-throttle');
const jwt = require('jsonwebtoken');

const request = require('request-promise').defaults({ simple: false });
// const hooksData = require('./hooksData');
const cipher = require('./cipher.js');
const log = require('./logging.js');
const { TaskExec } = require('./executor.js');
const amqp = require('./amqp.js');
const { ComponentReader } = require('./component_reader.js');

const AMQP_HEADER_META_PREFIX = 'x-eio-meta-';


function convertSettingsToCamelCase(settings) {
    return _.mapKeys(settings, (value, key) => _.camelCase(key));
}

function getAdditionalHeadersFromSettings(settings) {
    return convertSettingsToCamelCase(settings.additionalVars);
}

class Ferryman {
    constructor(settings) {
        this.settings = settings;
        this.messagesCount = 0;
        this.amqpConnection = new amqp.Amqp(settings);
        this.componentReader = new ComponentReader();
        this.snapshot = {};
        this.stepData = {};
        this.shutdownCallback = null;
        // eslint-disable-next-line new-cap
        this.apiClient = RestApiClient(
            settings.API_USERNAME,
            settings.API_KEY,
            {
                retryCount: settings.API_REQUEST_RETRY_ATTEMPTS,
                retryDelay: settings.API_REQUEST_RETRY_DELAY
            },
        );

        this.throttles = {
            // 100 Messages per Second
            data: pThrottle(() => Promise.resolve(true),
                settings.OUTPUT_RATE_LIMIT,
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
                COMPONENT_PATH: compPath
            },
            componentReader
        } = this;

        await componentReader.init(compPath);
    }

    async getSnapShot(flowId, stepId, token) {
        const getOptions = {
            uri: `${this.settings.SNAPSHOTS_SERVICE_BASE_URL}/snapshots/flows/${flowId}/steps/${stepId}`,
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            json: true,
            resolveWithFullResponse: true
        };
        const result = await request(getOptions);

        if (result.statusCode === 200) {
            return result.body.data;
        }

        if (result.statusCode === 404) {
            return null;
        }

        log.warn(`Failed to fetch the snapshot ${flowId}:${stepId}`);

        return null;
    }

    async disconnect() {
        log.debug('Disconnecting, %s messages in processing', this.messagesCount);
        return this.amqpConnection.disconnect();
    }

    async fetchSecret(secretId, token) {
        const options = {
            method: 'GET',
            uri: `${this.settings.SECRET_SERVICE_URL}/${secretId}`,
            json: true,
            headers: {
                authorization: `Bearer ${token}`
            }
        };

        const response = await request(options);

        if (response.statusCode === 200) {
            const secret = response.body;
            return secret;
        }
        return false;
    }

    reportError(err) {
        const headers = Object.assign({}, getAdditionalHeadersFromSettings(this.settings), {
            execId: this.settings.EXEC_ID,
            taskId: this.flowId, // this.settings.FLOW_ID,
            workspaceId: this.settings.WORKSPACE_ID,
            containerId: this.settings.CONTAINER_ID,
            userId: this.userId, // this.settings.USER_ID,
            stepId: this.stepId, // this.settings.STEP_ID,
            compId: this.settings.COMP_ID,
            function: this.function // this.settings.FUNCTION
        });
        return this.amqpConnection.sendError(err, headers);
    }

    // startup() {
    //   return co(function* doStartup() {
    //     log.debug('Starting up component');
    //     const result = yield this.invokeModuleFunction('startup');
    //     log.trace('Startup data', { result });
    //     const handle = hooksData.startup(this.settings);
    //     try {
    //       const state = _.isEmpty(result) ? {} : result;
    //       yield handle.create(state);
    //     } catch (e) {
    //       if (e.statusCode === 409) {
    //         log.warn('Startup data already exists. Rewriting.');
    //         yield handle.delete();
    //         yield handle.create(result);
    //       } else {
    //         log.warn('Component starting error');
    //         throw e;
    //       }
    //     }
    //     log.debug('Component started up');
    //     return result;
    //   }.bind(this));
    // }

    // runHookShutdown() {
    //   return co(function* doShutdown() {
    //     log.debug('About to shut down');
    //     // const handle = hooksData.startup(this.settings);
    //     const state = yield handle.retrieve();
    //     yield this.invokeModuleFunction('shutdown', state);
    //     yield handle.delete();
    //     log.debug('Shut down successfully');
    //   }.bind(this));
    // }

    // runHookInit() {
    //   return co(function* doInit() {
    //     log.debug('About to initialize component for execution');
    //     const res = yield this.invokeModuleFunction('init');
    //     log.debug('Component execution initialized successfully');
    //     return res;
    //   }.bind(this));
    // }

    invokeModuleFunction(moduleFunction, data, passedFunction) {
    // const { settings } = this;
        const { stepData } = this;
        return co(function* gen() {
            if (moduleFunction !== 'init' || this.function || passedFunction) {
                const module = yield this.componentReader.loadTriggerOrAction(
                    passedFunction || this.function,
                );
                if (!module[moduleFunction]) {
                    log.warn(module);
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
            return Promise.resolve();
        }.bind(this));
    }

    run() {
        const incomingQueue = this.settings.LISTEN_MESSAGES_ON;
        const handler = this.processMessageAndMaybeShutdownCallback.bind(this);
        log.debug('Start listening for messages on %s', incomingQueue);
        return this.amqpConnection.listenQueue(incomingQueue, handler);
    }

    // eslint-disable-next-line consistent-return
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

    scheduleShutdown() {
    // eslint-disable-next-line consistent-return
        return co(function* doScheduleShutdown() {
            if (this.shutdownCallback) {
                log.debug('scheduleShutdown – shutdown is already scheduled, do nothing');
                // eslint-disable-next-line no-return-assign
                return new Promise(resolve => this.shutdownCallback = resolve);
            }

            yield this.amqpConnection.listenQueueCancel();
            if (this.messagesCount === 0) {
                // there is no unfinished processMessage invocation, let's just resolve scheduleShutdown now
                log.debug('scheduleShutdown – about to shutdown immediately');
                return null;
            }
            // at least one processMessage invocation is not finished yet
            // let's return a Promise, which will be resolved by processMessageAndMaybeShutdownCallback
            log.debug('scheduleShutdown – shutdown is scheduled');
            // eslint-disable-next-line no-return-assign
            return new Promise(resolve => this.shutdownCallback = resolve);
        }.bind(this));
    }


    readIncomingMessageHeaders(message) {
        const { headers } = message.properties;

        // Get meta headers
        const metaHeaderNames = Object.keys(headers)
            .filter(key => key.toLowerCase().startsWith(AMQP_HEADER_META_PREFIX));

        const metaHeaders = _.pick(headers, metaHeaderNames);
        const metaHeadersLowerCased = _.mapKeys(metaHeaders, (value, key) => key.toLowerCase());

        const result = {
            stepId: this.stepId, // headers.stepId, // the only use is passthrough mechanism
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
    // eslint-disable-next-line consistent-this
        const self = this;

        // Prepare depending on message
        // this.flowId = message.properties.headers.taskId;
        // this.stepId = message.properties.headers.stepId;
        if (!message.properties
      || !message.properties.headers
      || !message.properties.headers.orchestratorToken
        ) {
            console.error('No orchestratorToken!');
            return;
        }
        const tokenData = jwt.decode(message.properties.headers.orchestratorToken);
        this.flowId = tokenData.flowId;
        this.stepId = tokenData.stepId;
        this.userId = tokenData.userId;
        this.function = tokenData.function;

        this.apiKey = tokenData.apiKey;
        this.apiUsername = tokenData.apiUsername;

        this.snapshotRoutingKey = tokenData.snapshotRoutingKey;

        // 'FLOW_ID',
        // 'EXEC_ID', // deprecated
        // 'STEP_ID',
        // 'USER_ID',
        // 'FUNCTION',
        // 'API_USERNAME',
        // 'API_KEY',

        // get snapshot
        let stepData = await this.getSnapShot(this.flowId, this.stepId, this.apiKey); // token

        if (stepData) {
            this.snapshot = stepData.snapshot;
        } else {
            this.snapshot = {};
        }

        this.stepData = Object.assign({}, this.stepData, stepData);
        // todo: Find a way to do this without overwriting this.stepData
        // console.log(message)
        // await this.prepare(true, message.properties.headers.authToken);

        const { settings } = this;
        const incomingMessageHeaders = this.readIncomingMessageHeaders(message);
        const origPassthrough = _.cloneDeep(payload.passthrough) || {};

        const { routingKey } = message.fields;

        self.messagesCount += 1;

        const timeStart = Date.now();
        const { deliveryTag } = message.fields;

        const logger = log.child({
            threadId: incomingMessageHeaders.threadId || 'unknown',
            messageId: incomingMessageHeaders.messageId || 'unknown',
            routingKey: routingKey || 'unknown',
            parentMessageId: incomingMessageHeaders.parentMessageId || 'unknown',
            deliveryTag
        });

        logger.trace({ messagesCount: this.messagesCount }, 'processMessage received');

        // Fetch secret if necessary
        let secret = false;
        // if (incomingMessageHeaders.secret && incomingMessageHeaders.authToken) {
        //     secret = await
        // this.fetchSecret(incomingMessageHeaders.secret, incomingMessageHeaders.authToken);
        // }
        if (incomingMessageHeaders.secret && incomingMessageHeaders.authToken) {
            // @todo: update to new variables
            secret = await this.fetchSecret(
                incomingMessageHeaders.secret,
                incomingMessageHeaders.authToken,
            );
        }


    stepData = this.stepData; // eslint-disable-line

        const cfg = _.cloneDeep(stepData.config) || {};
        const snapshot = _.cloneDeep(this.snapshot);
        if (secret) {
            _.assign(cfg, secret);
        }

        // TODO: Determine whether setting value can/should be disregarded entirely
        const action = this.function || settings.FUNCTION;

        log.debug('Trigger or action: %s', action);

        // this.flowId this.stepId

        const outgoingMessageId = uuid.v4();
        const outgoingMessageHeaders = {
            ...incomingMessageHeaders,
            ...getAdditionalHeadersFromSettings(settings),
            'parentMessageId': incomingMessageHeaders.messageId,
            'threadId': incomingMessageHeaders.threadId,
            'messageId': outgoingMessageId,
            'execId': settings.EXEC_ID,
            'taskId': this.flowId, // message.properties.headers.taskId, // settings.FLOW_ID,
            'workspaceId': settings.WORKSPACE_ID,
            'containerId': settings.CONTAINER_ID,
            'userId': this.userId, // message.properties.headers.userId, // settings.USER_ID,
            'stepId': this.stepId, // message.properties.headers.stepId, // settings.STEP_ID,
            'compId': settings.COMP_ID,
            'function': this.function,
            'start': new Date().getTime(),
            'cid': cipher.id,
            'x-eio-routing-key': routingKey,
            'orchestratorToken': message.properties.headers.orchestratorToken
        };
        let module;
        try {
            module = await this.componentReader.loadTriggerOrAction(action);
        } catch (e) {
            log.error(e);
            outgoingMessageHeaders.end = new Date().getTime();
            self.amqpConnection.sendError(e, outgoingMessageHeaders, message);
            self.amqpConnection.reject(message);
            return;
        }


        // eslint-disable-next-line consistent-return
        return new Promise((resolve) => {
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

            taskExec.process(module, _.cloneDeep(payload), cfg, snapshot);

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
                        // eslint-disable-next-line
                        const { stepId } = this.stepId; // incomingMessageHeaders;
                        if (stepId) {
                            // eslint-disable-next-line no-param-reassign
                            data.passthrough = Object.assign({}, origPassthrough, {
                                [stepId]: Object.assign({}, _.omit(payload, 'passthrough'))
                            });
                        }
                    } else {
                        // eslint-disable-next-line no-param-reassign
                        data.passthrough = Object.assign({}, origPassthrough, {
                            [self.settings.STEP_ID]: Object.assign({}, _.omit(data, 'passthrough'))
                        });
                    }
                }

                // headers['x-eio-routing-key'] = routingKey;
                try {
                    // return await self.amqpConnection.sendData(data, headers, self.throttles.data);
                    return await self.amqpConnection.sendBackChannel(data, headers, self.throttles.data);
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
                // eslint-disable-next-line no-param-reassign
                err = formatError(err);
                taskExec.errorCount += 1;
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
                // eslint-disable-next-line no-param-reassign
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
                self.snapshot = data; // replacing `local` snapshot
                return self.amqpConnection.sendSnapshot(data, headers, self.throttles.snapshot);
            }

            async function onUpdateSnapshot(data) {
                const headers = _.clone(outgoingMessageHeaders);
                headers.snapshotEvent = 'updateSnapshot';

                if (_.isPlainObject(data)) {
                    if (data.$set) {
                        return log.warn('ERROR: $set is not supported any more in `updateSnapshot` event');
                    }
                    _.extend(self.snapshot, data); // updating `local` snapshot
                    // eslint-disable-next-line
                    return self.amqpConnection.sendSnapshot(data, headers, null, this.snapshotRoutingKey);
                }
                log.error('You should pass an object to the `updateSnapshot` event');
                return false;
            }

            async function onUpdateKeys(keys) {
                logger.trace({
                    messageProcessingTime: Date.now() - timeStart
                }, 'processMessage emit updateKeys');

                try {
                    // eslint-disable-next-line no-underscore-dangle
                    await self.apiClient.accounts.update(cfg._account, { keys });
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
            }
            return {
                message: err || 'Not Available',
                stack: 'Not Available',
                name: 'Error'
            };
        }
    }
}

exports.Ferryman = Ferryman;
