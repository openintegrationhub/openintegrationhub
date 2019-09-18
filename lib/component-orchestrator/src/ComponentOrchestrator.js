const { Event } = require('@openintegrationhub/event-bus');

async function loop (body, logger, loopInterval) {
    logger.info('loop TICK');
    try {
        await body();
    } catch (e) {
        logger.error(e, 'loop body error');
    }
    setTimeout(async () => {
        loop(body, logger, loopInterval);
    }, loopInterval);
}

class ComponentOrchestrator {
    constructor({ config, logger, queuesManager, flowsDao, componentsDao, tokensDao, driver, eventBus }) {
        this._config = config;
        this._logger = logger.child({service: 'ComponentOrchestrator'});
        this._queuesManager = queuesManager;
        this._flowsDao = flowsDao;
        this._componentsDao = componentsDao;
        this._driver = driver;
        this._eventBus = eventBus;
        this._tokensDao = tokensDao;
    }

    start() {
        loop(this._loopBody.bind(this), this._logger, this._config.get('TICK_INTERVAL') || 10000);
    }

    async _loopBody() {
        //TODO any step here blocks all the job, that's shit. Timeouts, multiple execution threads with limits for
        //parallel jobs not to destroy backend;
        const allFlows = await this._flowsDao.findAll();
        const allApps = await this._driver.getAppList();
        await this._processState(allFlows, allApps);
    }

    async _processState(allFlows, allApps) {
        const appsIndex = await this._buildJobIndex(allApps);
        for (let flow of allFlows) {
            try {
                await this._handleFlow(flow, appsIndex);
            } catch (err) {
                this._logger.error({err, flow}, 'Failed to process flow');
            }
        }
        await this._removeLostJobs(allApps, allFlows);
    }

    async _handleFlow(flow, appsIndex) {
        const logger = this._logger.child({flowId: flow.id});
        logger.trace({nodes: Object.keys(appsIndex[flow.id] || {})}, 'Flow nodes already running');

        if (flow.isStopping) {
            await this._deleteRunningAppsForFlow(flow, appsIndex);
            await this._queuesManager.deleteForFlow(flow);
            await this._tokensDao.deleteTokenForFlowAndUser({flowId: flow.id, userId: flow.startedBy});
            await this._sendFlowStoppedEvent(flow);
            await flow.onStopped();
            return;
        }

        const nodes = await flow.getNodes();
        for (let node of nodes) {
            if (!appsIndex[flow.id] || !appsIndex[flow.id][node.id]) {
                //@todo: abstraction for settings
                const settings = await this._queuesManager.getSettingsForNodeExecution(flow, node);
                if (flow.startedBy) {
                    try {
                        settings.IAM_TOKEN = await this._tokensDao.getTokenForFlowAndUser({
                            flowId: flow.id,
                            userId: flow.startedBy
                        });
                    } catch (e) {
                        logger.error(e, 'Failed to get IAM token');
                    }
                }

                logger.trace({nodeId: node.id}, 'Going to deploy a flow node');
                const component = await this._componentsDao.findById(node.componentId);
                if (!component) {
                    logger.warn({componentId: node.componentId}, 'Component is not found');
                    continue;
                }
                this._logger.trace({component}, 'Found component');
                await this._driver.createApp(flow, node, settings, component);
            }
        }

        if (flow.isStarting) {
            await this._sendFlowStartedEvent(flow);
            await flow.onStarted();
        }
    }

    async _sendFlowStartedEvent(flow) {
        const event = new Event({
            headers: {
                name: 'flow.started'
            },
            payload: { id: flow.id }
        });

        await this._eventBus.publish(event);
    }

    async _sendFlowStoppedEvent(flow) {
        const event = new Event({
            headers: {
                name: 'flow.stopped'
            },
            payload: { id: flow.id }
        });

        await this._eventBus.publish(event);
    }

    _buildJobIndex(allJobs) {
        return allJobs.reduce((index, app) => {
            const flowId = app.flowId;
            const nodeId = app.nodeId;
            index[flowId] = index[flowId] || {};
            index[flowId][nodeId] = app;
            return index;
        }, {});
    }

    async _deleteRunningAppsForFlow(flow, appsIndex) {
        for (let app of Object.values(appsIndex[flow.id] || {})) {
            this._logger.trace({flow: flow.id, app: app.id}, 'Going to delete flow node');
            await this._driver.destroyApp(app);
        }
    }

    async _removeLostJobs(allApps, allFlows) {
        const flowsIndex = this._buildFlowsIndex(allFlows);
        for (let app of allApps) {
            const flowId = app.flowId;
            const nodeId = app.nodeId;
            if (!flowsIndex[flowId] || !flowsIndex[flowId][nodeId]) {
                await this._driver.destroyApp(app);
            }
        }
    }

    _buildFlowsIndex(allFlows) {
        return allFlows.reduce((index, flow) => {
            const flowId = flow.id;
            (flow.graph.nodes || []).forEach((node) => {
                index[flowId] = index[flowId] || {};
                index[flowId][node.id] = node;
            });
            return index;
        }, {});
    }
}

module.exports = ComponentOrchestrator;
