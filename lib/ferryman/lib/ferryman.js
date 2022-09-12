const uuid = require('uuid');
const _ = require('lodash');
// const RestApiClient = require('elasticio-rest-node');
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

const { transform } = require('./transformer.js');

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
        this.restAPI = null;
        this.restAPIServer = null;
        // eslint-disable-next-line new-cap
        // this.apiClient = RestApiClient(
        //     settings.API_USERNAME,
        //     settings.API_KEY,
        //     {
        //         retryCount: settings.API_REQUEST_RETRY_ATTEMPTS,
        //         retryDelay: settings.API_REQUEST_RETRY_DELAY
        //     },
        // );

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

    async setupRestAPI() {
        this.restAPI = require('express')();
        const controller = require('./rest-api/controller');

        // store ferryman instance reference
        this.restAPI.use((req, res, next) => {
            req.ferryman = this;
            next();
        });

        // setup controller
        this.restAPI.use('/', controller);

        this.restAPIServer = await this.restAPI.listen(3001);
        log.info(`Component REST API listening on port 3001`);
    }

    async getSnapShot(flowId, stepId, token, flowExecId) {
        try {
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
        } catch (e) {
            log.error(e);
            log.error(`Error: Failed to fetch the snapshot ${flowId}:${stepId}`);

            return null;
        }
    }


    async getDataHubEntryByOihId(oihUid, token) {
        try {
            const getOptions = {
                uri: `${this.settings.DATAHUB_BASE_URL}/data/${oihUid}`,
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

            log.warn(`Failed to fetch the entry from the data-hub ${oihUid}`);

            return null;
        } catch (e) {
            log.error(e);
            log.warn(`Error: Failed to fetch the entry from the data-hub ${oihUid}`);

            return null;
        }
    }

    async getDataHubEntryByRecordId(recordUid, token) {
        try {
            const getOptions = {
                uri: `${this.settings.DATAHUB_BASE_URL}/data/recordId/${recordUid}`,
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

            log.warn(`Failed to fetch the entry from the data-hub via recordId ${recordUid}`);

            return null;

        } catch (e) {
            log.error(e);
            log.warn(`Error: Failed to fetch the entry from the data-hub via recordId ${recordUid}`);

            return null;
        }
    }

    async deleteRecordIdFromDataHubEntry(oihUid, applicationUid, recordUid, token) {
        try {
            const options = {
                // eslint-disable-next-line
                uri: `${this.settings.DATAHUB_BASE_URL}/data/${encodeURIComponent(oihUid)}/${encodeURIComponent(applicationUid)}/${encodeURIComponent(recordUid)}`,
                method: 'DELETE',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                json: true,
                resolveWithFullResponse: true
            };
            const result = await request(options);

            if (result.statusCode === 200 || result.statusCode === 201) {
                return result.body.data;
            }

            if (result.statusCode === 404) {
                return false;
            }

            // eslint-disable-next-line max-len
            log.warn(`Failed to post entry to the data-hub via oihUid ${oihUid} applicationUid ${applicationUid} recordId ${recordUid}`);

            return null;
        } catch (e) {
            log.error(e);
            // eslint-disable-next-line max-len
            log.warn(`Error: Failed to post entry to the data-hub via oihUid ${oihUid} applicationUid ${applicationUid} recordId ${recordUid}`);

            return null;
        }
    }

    async upsertDataHubEntry(applicationUid, recordUid, oihUid, token) {
        try {
            const body = {
                applicationUid,
                recordUid,
                oihUid
            };

            const postOptions = {
                uri: `${this.settings.DATAHUB_BASE_URL}/data/recordId`,
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                json: true,
                body,
                resolveWithFullResponse: true
            };
            const result = await request(postOptions);

            if (result.statusCode === 200 || result.statusCode === 201) {
                return result.body.data;
            }

            if (result.statusCode === 404) {
                return null;
            }

            log.warn(`Failed to post entry to the data-hub via applicationUid: ${applicationUid}
              oihUid ${oihUid} recordId ${recordUid}`);

            return null;
        } catch (e) {
            log.error(e);
            // eslint-disable-next-line max-len
            log.warn(`Error: Failed to post entry to the data-hub via applicationUid ${applicationUid}
              oihUid ${oihUid} recordId ${recordUid}`);

            return null;
        }
    }

    async disconnect() {
        if (this.restAPIServer) {
            log.info('Stopping RestAPI');
            this.restAPIServer.close();
        }

        log.info('Disconnecting, %s messages in processing', this.messagesCount);
        return this.amqpConnection.disconnect();
    }

    async fetchSecret(secretId, token) {
        try {
            const options = {
                method: 'GET',
                uri: `${this.settings.SECRET_SERVICE_BASE_URL}/secrets/${secretId}`,
                json: true,
                headers: {
                    authorization: `Bearer ${token}`
                },
                resolveWithFullResponse: true
            };

            const response = await request(options);
            if (response.statusCode === 200) {
                const { data } = response.body;
                if (data.type === 'MIXED') {
                    try {
                        const payload = JSON.parse(data.value.payload);
                        return payload;
                    } catch (e) {
                        return { payload: data.value.payload };
                    }
                }
                return data.value;
            }
            log.error(`Could not fetch Secret: ${response.statusCode} - ${JSON.stringify(response.body)}`);
            return {};
        } catch (e) {
            log.error(e);
            return {};
        }
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
                    passedFunction || this.function
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
        log.info('Start listening for messages on %s', incomingQueue);
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
                    log.info('About to invoke shutdownCallback');
                    this.shutdownCallback();
                    this.shutdownCallback = null;
                } else {
                    // there is another not finished processMessage invocation
                    log.info('No shutdownCallback since messagesCount is not zero');
                }
            }
        }
    }

    scheduleShutdown() {
    // eslint-disable-next-line consistent-return
        return co(function* doScheduleShutdown() {
            if (this.shutdownCallback) {
                log.info('scheduleShutdown – shutdown is already scheduled, do nothing');
                // eslint-disable-next-line no-return-assign
                return new Promise(resolve => this.shutdownCallback = resolve);
            }

            yield this.amqpConnection.listenQueueCancel();
            if (this.messagesCount === 0) {
                // there is no unfinished processMessage invocation, let's just resolve scheduleShutdown now
                log.info('scheduleShutdown – about to shutdown immediately');
                return null;
            }
            // at least one processMessage invocation is not finished yet
            // let's return a Promise, which will be resolved by processMessageAndMaybeShutdownCallback
            log.info('scheduleShutdown – shutdown is scheduled');
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
            log.info({ threadId }, 'Initiate new thread as it is not started ATM');
            result.threadId = threadId;
        }
        if (headers.reply_to) {
            result.reply_to = headers.reply_to;
        }
        return result;
    }

    async generateProvenanceEvent(data, headers, throttles, self) { //eslint-disable-line no-unused-vars

        let actionType = 'Unknown';
        if (data.function in data.componentJson.triggers) {
            actionType = 'ObjectReceived';
        } else if (data.function in data.componentJson.actions) {
            actionType = 'ObjectCreated';
            if (data.function.includes('update')) {
                actionType = 'ObjectUpdated';
            } else if (data.function.includes('delete')) {
                actionType = 'ObjectDeleted';
            }
        }

        if (data.deleteType) {
            const deleteTypes = ['pending', 'confirmed', 'denied', 'failed'];

            if (deleteTypes.indexOf(data.deleteType) > -1) {
                actionType = `Delete${data.deleteType[0].toUpperCase() + data.deleteType.substring(1)}`;
            } else {
                actionType = `DeleteUnknown`;
                log.error(`Received unknown response after delete command [${data.deleteType}]`);
            }
        }


        const newEvent = { //eslint-disable-line no-unused-vars
            entity: {
                id: data.oihUid,
                entityType: 'oihUid',
                alternateOf: [data.recordUid]
            },
            activity: {
                id: data.flowId,
                activityType: actionType,
                used: data.function,
                startedAtTime: data.startTime,
                endedAtTime: data.endTime
            },
            agent: {
                id: data.connectorId,
                agentType: 'Connector'
            },
            actedOnBehalfOf: [
                {
                    first: true,
                    id: data.connectorId,
                    agentType: 'Connector',
                    actedOnBehalfOf: data.userId
                },
                {
                    id: data.userId,
                    agentType: 'User',
                    actedOnBehalfOf: data.tenantId
                },
                {
                    id: data.tenantId,
                    agentType: 'Tenant'
                },
                {
                    id: data.flowId,
                    agentType: 'Flow'
                }
            ]
        };

        if (data.nodeSettings && data.nodeSettings.applicationUid) {
            newEvent.actedOnBehalfOf.push({
                id: data.connectorId,
                agentType: 'Application',
                actedOnBehalfOf: data.nodeSettings.applicationUid
            });
        }

        return await self.amqpConnection.sendGovernanceChannel(newEvent, headers, throttles);
    }

    async getIdMeta(oihMeta, self) {
        let oihUid = false;
        let refs = false;

        // Check if oihUid exists
        if ('oihUid' in oihMeta && oihMeta.oihUid) {
            const data = await self.getDataHubEntryByOihId(oihMeta.oihUid, self.apiKey);

            if (data && data.id) {
                oihUid = data.id;
                refs = data.refs;
            }
            // Check if recordUid exists
        } else if ('recordUid' in oihMeta && oihMeta.recordUid) {
            const data = await self.getDataHubEntryByRecordId(oihMeta.recordUid, self.apiKey);

            if (data && data.id) {
                oihUid = data.id;
                refs = data.refs;
            }
        }

        return { oihUid, refs };
    }

    async applyPolicy(object, action, token) {
        try {
            const response = await request({
                method: 'POST',
                uri: `${this.settings.GOVERNANCE_SERVICE_BASE_URL}/applyPolicy`,
                json: true,
                body: object,
                headers: {
                    authorization: `Bearer ${token}`
                },
                qs: { action },
                resolveWithFullResponse: true
            });

            if (response.statusCode === 200) {
                return {
                    passes: response.body.passes,
                    newData: response.body.data
                };
            }

            return { passes: false };
        } catch (e) {
            log.error(e);
            return { passes: false };
        }
    }

    async processMessage(payload, message) {
        // eslint-disable-next-line consistent-this
        const self = this;


        // Prepare depending on message
        if (!message.properties
      || !message.properties.headers
      || !message.properties.headers.orchestratorToken
        ) {
            console.error('No orchestratorToken!');
            return;
        }
        const tokenData = jwt.decode(message.properties.headers.orchestratorToken);

        if (tokenData) {
            this.flowId = tokenData.flowId;
            this.stepId = tokenData.stepId;
            this.userId = tokenData.userId;
            this.tenant = tokenData.tenant;
            this.function = tokenData.function;
            this.nodeSettings = tokenData.nodeSettings;
            this.apiKey = tokenData.apiKey;
            this.apiUsername = tokenData.apiUsername;

            this.snapshotRoutingKey = tokenData.snapshotRoutingKey;
        } else {
            log.warn('Could not decode jwt!');
        }

        if (!tokenData) {return false;}

        if (this.nodeSettings && this.nodeSettings.applyTransform
          && (this.nodeSettings.applyTransform === 'before' || this.nodeSettings.applyTransform === 'both')) {
            const transformCfg = {
                customMapping: this.nodeSettings.transformFunction
            };
            const transformedMsg = transform(payload, transformCfg, false);
            payload = transformedMsg;
        }

        if (this.nodeSettings && this.nodeSettings.applyPolicy) {
            const { passes, newData } = await this.applyPolicy(
                payload,
                this.nodeSettings.policyAction,
                tokenData.apiKey
            );

            if (!passes) {
                log.info('Data blocked due to object policy constraints');
                return self.amqpConnection.ack(message);
            }
            if (newData) {
                payload.data = newData;
            }
        }

        if (this.nodeSettings && this.nodeSettings.flowPolicy) {
            const flowPolicyObject = {
                metadata: {
                    policy: this.nodeSettings.flowPolicy
                },
                data: payload.data
            };

            const { passes, newData } = await this.applyPolicy(
                flowPolicyObject,
                this.nodeSettings.policyAction,
                tokenData.apiKey
            );

            if (!passes) {
                log.info('Data blocked due to flow policy constraints');
                return self.amqpConnection.ack(message);
            }
            if (newData) {
                payload.data = newData;
            }
        }

        const cfg = tokenData.fields || {};

        // add custom node settings defined per node inside a flow
        cfg.nodeSettings = tokenData.nodeSettings || {};


        const payloadOihMeta = (payload.metadata)
            ? payload.metadata : {};

        let getIdMetaResult = false;
        if (this.settings.DATAHUB_BASE_URL) {
            if (cfg.nodeSettings.idLinking) {
                getIdMetaResult = await this.getIdMeta({
                    oihUid: payloadOihMeta.oihUid,
                    recordUid: payloadOihMeta.recordUid
                }, self);

                const { applicationUid, alternateAppUid } = this.nodeSettings;

                // Check if we have any recordUid to pass to component
                if (getIdMetaResult && getIdMetaResult.refs && Array.isArray(getIdMetaResult.refs)) {
                    for (let ref of getIdMetaResult.refs) {
                        if (ref.applicationUid === applicationUid || ref.applicationUid === alternateAppUid) {
                            payload.metadata.recordUid = ref.recordUid;
                            break;
                        }
                    }
                }
            }
        }


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

        if (tokenData && tokenData.secretId && tokenData.apiKey) {
            secret = await this.fetchSecret(
                tokenData.secretId,
                tokenData.apiKey
            );
        }

        const stepData = {}; // holdover necessary for compatibility, @todo: remove entirely

        // eslint-disable-next-line max-len
        const snapshot = await this.getSnapShot(tokenData.flowId, tokenData.stepId, tokenData.apiKey, tokenData.flowExecId) || {};

        if (secret) {
            _.assign(cfg, secret);
        }

        // TODO: Determine whether setting value can/should be disregarded entirely
        const action = this.function || settings.FUNCTION;

        log.info('Trigger or action: %s', action);

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
        let componentJson;
        try {
            module = await this.componentReader.loadTriggerOrAction(action);
            componentJson = this.componentReader.componentJson;
        } catch (e) {
            log.error(e);
            outgoingMessageHeaders.end = new Date().getTime();
            if (self.amqpConnection) {
                self.amqpConnection.sendError(e, outgoingMessageHeaders, message);
                self.amqpConnection.reject(message);
            } else {
                log.error('No amqpConnection!');
            }
            return false;
        }


        // eslint-disable-next-line consistent-return
        return new Promise((resolve) => {
            let endWasEmitted;


            const taskExec = new TaskExec({
                loggerOptions: {
                    ..._.pick(incomingMessageHeaders, ['threadId', 'messageId', 'parentMessageId']),
                    ..._.pick(tokenData, ['flowExecId', 'flowId', 'function', 'stepId', 'tenant', 'userId'])
                },
                variables: stepData.variables,
                services: {
                    // apiClient: self.apiClient,
                    amqp: self.amqpConnection,
                    config: self.settings
                }
            });

            const onData = async (data) => {
                const passedCfg = Object.assign({}, data.passedCfg);
                const savedMeta = Object.assign({}, data.metadata);

                const currentApplicationUid = (
                    passedCfg
                  && passedCfg.nodeSettings
                  && passedCfg.nodeSettings.applicationUid
                ) ? passedCfg.nodeSettings.applicationUid
                    : ((data && data.metadata) ? data.metadata.applicationUid : null);

                delete data.passedCfg;
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

                if (passedCfg.nodeSettings && passedCfg.nodeSettings.applyTransform
                    && (passedCfg.nodeSettings.applyTransform === 'after'
                      || passedCfg.nodeSettings.applyTransform === 'both')
                ) {
                    const transformCfg = {
                        customMapping: passedCfg.nodeSettings.secondTransformFunction
                            ? passedCfg.nodeSettings.secondTransformFunction : passedCfg.nodeSettings.transformFunction
                    };
                    const transformedMsg = transform(data, transformCfg, false);
                    data = transformedMsg;
                }

                if (passedCfg.nodeSettings && passedCfg.nodeSettings.autoSaveSnapshots) {
                    await onUpdateSnapshot(data);
                }


                if (self.settings.DATAHUB_BASE_URL
                    && passedCfg.nodeSettings
                    && passedCfg.nodeSettings.idLinking
                ) {
                    // log.info('In onData ID Linking!');
                    // log.info('oihUid:', data.metadata.oihUid);
                    // log.info('recordUid:', data.metadata.recordUid); // Correct here

                    let oihMeta = {};
                    if (data.metadata && data.metadata.recordUid) {
                        oihMeta = {
                            oihUid: data.metadata.oihUid,
                            recordUid: data.metadata.recordUid
                        };
                    }

                    const getIdMetaResult = await self.getIdMeta(oihMeta, self);

                    let dataHubEntryHasRecordUid = false;
                    if (getIdMetaResult && getIdMetaResult.refs && Array.isArray(getIdMetaResult.refs)) {
                        for (let ref of getIdMetaResult.refs) {
                            if (ref.applicationUid === currentApplicationUid) {
                                if (ref.recordUid === data.metadata.recordUid) {
                                    dataHubEntryHasRecordUid = true;
                                    break;
                                }
                            }
                        }
                    }


                    if (dataHubEntryHasRecordUid === false) {
                        // Create new oihUid if none found
                        // const { recordUid } = data.metadata; // incorrect here
                        const oihUid = (getIdMetaResult.oihUid) ? getIdMetaResult.oihUid : savedMeta.oihUid;
                        const applicationUid = (passedCfg.nodeSettings && passedCfg.nodeSettings.applicationUid)
                            ? passedCfg.nodeSettings.applicationUid
                            : (self.oihMeta ? self.oihMeta.applicationUid : null);

                        // log.info('About to upsert data entry with: ');
                        // log.info('applicationUid: ', applicationUid);
                        // log.info('recordUid: ', savedMeta.recordUid);
                        // log.info('oihUid: ', oihUid);
                        const response = await self.upsertDataHubEntry(
                            applicationUid,
                            savedMeta.recordUid,
                            oihUid,
                            self.apiKey
                        );

                        // log.info('Received Response: ', JSON.stringify(response));
                        if (response && response.id && data.metadata) {
                            oihMeta.oihUid = response.id;
                        }
                    } else {
                        oihMeta.oihUid = getIdMetaResult.oihUid;
                    }

                    data.metadata = {};
                    if (oihMeta && oihMeta.oihUid) {
                        data.metadata.oihUid = oihMeta.oihUid;
                    }

                    // delete data.metadata.recordUid;


                } else if (passedCfg.nodeSettings && passedCfg.nodeSettings.idLinking) {
                    log.warn('No DATAHUB_BASE_URL defined skipping ID-Linking functions in onData');
                }

                try {
                    let deleteType = null;
                    const now = new Date();
                    const endTime = now.toISOString();

                    if (
                        passedCfg.nodeSettings
                      && typeof (passedCfg.nodeSettings === 'object')
                      && passedCfg.nodeSettings.governance
                    ) {
                        const oihUid = (data.metadata && data.metadata.oihUid)
                            ? data.metadata.oihUid : savedMeta.oihUid;

                        if (passedCfg && passedCfg.deletes && data.data.delete) {
                            deleteType = data.data.delete;

                            if (data.data.delete === 'confirmed') {
                                const applicationUid = (passedCfg.nodeSettings && passedCfg.nodeSettings.applicationUid)
                                    ? passedCfg.nodeSettings.applicationUid
                                    : (self.oihMeta ? self.oihMeta.applicationUid : null);

                                const response = await self.deleteRecordIdFromDataHubEntry(
                                    oihUid,
                                    applicationUid,
                                    savedMeta.recordUid,
                                    self.apiKey
                                );

                                if (response === false) {
                                    // eslint-disable-next-line max-len
                                    log.error(`DataHub update failed. RecordUid: ${savedMeta.recordUid} applicationUid: ${applicationUid} not found in entry: ${oihUid}`);
                                } else if (response === null) {
                                    // eslint-disable-next-line max-len
                                    log.error(`DataHub update failed for recordUid: ${savedMeta.recordUid} applicationUid: ${applicationUid} oihUid: ${oihUid}`);
                                }
                            }
                        }

                      await self.generateProvenanceEvent({ // eslint-disable-line
                            oihUid: oihUid,
                            recordUid: savedMeta.recordUid,
                            deleteType,
                            connectorId: this.settings.COMP_ID,
                            flowId: tokenData.flowId,
                            stepId: tokenData.stepId,
                            userId: tokenData.userId,
                            tenantId: tokenData.tenantId,
                            function: tokenData.function,
                            startTime,
                            endTime,
                            componentJson,
                            nodeSettings: passedCfg.nodeSettings
                        }, headers, null, self);
                    }

                    return await self.amqpConnection.sendBackChannel(data, headers, self.throttles.data);
                } catch (err) {
                    console.error(err);
                    return onError(err);
                }
            };

            taskExec
                .on('data', onData)
                .on('error', onError)
                .on('rebound', onRebound)
                .on('snapshot', onSnapshot)
                .on('updateSnapshot', onUpdateSnapshot)
                .on('raw-record', onRawRecord)
                // .on('updateKeys', onUpdateKeys)
                .on('httpReply', onHttpReply)
                .on('end', onEnd);


            const now = new Date();
            const startTime = now.toISOString();

            taskExec.process(module, _.cloneDeep(payload), cfg, snapshot, incomingMessageHeaders, tokenData);

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
                err = formatError(err, self.flowId, self.settings.COMP_ID, self.tenant);
                taskExec.errorCount += 1;
                logger.trace({
                    err,
                    messagesCount: self.messagesCount,
                    messageProcessingTime: Date.now() - timeStart
                }, 'processMessage emit error');
                headers.end = new Date().getTime();

                const result = self.amqpConnection.sendError(err, headers, message, self.throttles.error);
                await onEnd();
                return result;
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
                delete data.passedCfg;
                const headers = _.clone(outgoingMessageHeaders);
                headers.snapshotEvent = 'snapshot';
                //headers.flowExecId = tokenData.flowExecId;
                headers.tenant = tokenData.tenant;
                // self.snapshot = data; // replacing `local` snapshot
                return self.amqpConnection.sendSnapshot(
                    data,
                    headers,
                    self.throttles.snapshot
                );
            }

            async function onRawRecord(data) {
                delete data.passedCfg;

                // add tenant id
                data.tenant = self.tenant;

                const headers = _.clone(outgoingMessageHeaders);
                return self.amqpConnection.sendRawRecord(data, headers);
            }

            async function onUpdateSnapshot(data) {
                delete data.passedCfg;
                const headers = _.clone(outgoingMessageHeaders);
                headers.snapshotEvent = 'updateSnapshot';

                //headers.flowExecId = tokenData.flowExecId;
                headers.tenant = tokenData.tenant;

                if (_.isPlainObject(data)) {
                    if (data.$set) {
                        return log.warn('ERROR: $set is not supported any more in `updateSnapshot` event');
                    }
                    _.extend(self.snapshot, data); // updating `local` snapshot
                    // eslint-disable-next-line
                    return self.amqpConnection.sendSnapshot(data, headers, null);
                }
                log.error('You should pass an object to the `updateSnapshot` event');
                return false;
            }

            // async function onUpdateKeys(keys) {
            //     logger.trace({
            //         messageProcessingTime: Date.now() - timeStart
            //     }, 'processMessage emit updateKeys');
            //
            //     try {
            //         // eslint-disable-next-line no-underscore-dangle
            //         await self.apiClient.accounts.update(cfg._account, { keys });
            //         logger.debug('Successfully updated keys #%s', deliveryTag);
            //     } catch (error) {
            //         logger.error('Failed to updated keys #%s', deliveryTag);
            //         await onError(error);
            //     }
            // }

            function onEnd() {
                if (endWasEmitted) {
                    if (taskExec.errorCount === 0) {
                        logger.warn({
                            messagesCount: self.messagesCount,
                            errorCount: taskExec.errorCount,
                            messageProcessingTime: Date.now() - timeStart
                        }, 'processMessage emit end was called more than once');
                    }
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

                const headers = _.clone(outgoingMessageHeaders);
                self.amqpConnection.sendFunctionComplete(headers,null);
                resolve();
            }
        });


        function formatError(err, flowId, componentId, tenant) {
            if (err instanceof Error || (_.isObject(err) && _.has(err, 'message'))) {
                return {
                    message: err.message,
                    stack: err.stack || 'Not Available',
                    name: err.name || 'Error',
                    timestamp: Date.now(),
                    flowId,
                    componentId,
                    tenant
                };
            }
            return {
                message: err || 'Not Available',
                stack: 'Not Available',
                name: 'Error',
                timestamp: Date.now(),
                flowId,
                componentId,
                tenant
            };
        }
    }
}

exports.Ferryman = Ferryman;
