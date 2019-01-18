//@see https://github.com/kubernetes/community/blob/master/contributors/devel/api-conventions.md
const _ = require('lodash');

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

class ResourceCoordinator {
    constructor({ config, logger, infrastructureManager, rabbitmqManagement, flowsDao, driver }) {
        this._config = config;
        this._logger = logger.child({service: 'ResourceCoordinator'});
        this._rabbitmqManagement = rabbitmqManagement;
        this._infrastructureManager = infrastructureManager;
        this._flowsDao = flowsDao;
        this._driver = driver;
    }

    start() {
        loop(this._loopBody.bind(this), this._logger, this._config.get('TICK_INTERVAL') || 10000);
    }

    async _loopBody() {
        //TODO any step here blocks all the job, that's shit. Timeouts, multiple execution threads with limits for
        //parallel jobs not to destroy backend;
        const flows = await this._flowsDao.findAll();
        const allApps = await this._driver.getAppList();
        const queuesStructure = await this._getQueuesStructure();
        await this._processState(flows, allApps, queuesStructure);
    }

    async _processState(flows, allApps, queuesStructure) {
        const appsIndex = await this._buildJobIndex(allApps);
        for (let flow of flows) {
            await this._handleFlow(flow, appsIndex, queuesStructure);
        }
        await this._removeLostJobs(allApps, flows);
    }

    async _handleFlow(flow, appsIndex, queuesStructure) {
        const logger = this._logger.child({flowId: flow.id});
        if (flow.isDeleted) {
            logger.trace('Going to delete flow');

            await this._deleteRunningAppsForFlow(flow, appsIndex);
            await this._infrastructureManager.deleteForFlow(flow, queuesStructure);

            await this._flowsDao.removeFinalizer(flow); //@todo: onFlowDeleted?
            return;
        }

        if (flow.isNew) {
            // ensure flow infrastructure - finalizer + secret + queues
            await this._infrastructureManager.createForFlow(flow);
            await this._flowsDao.ensureFinalizer(flow); //@todo: onFlowCreated?
        }

        if (await this._isRedeployRequired(flow, appsIndex)) {
            logger.trace('Flow has been changed. Redeploying.');
            await this._deleteRunningAppsForFlow(flow, appsIndex);
            await this._infrastructureManager.updateForFlow(flow, queuesStructure);
            delete appsIndex[flow.id];
        }

        logger.trace({nodes: Object.keys(appsIndex[flow.id] || {})}, 'Flow nodes already running');
        for (let node of flow.nodes) {
            if (!appsIndex[flow.id] || !appsIndex[flow.id][node.id]) {
                //@todo: abstraction for settings
                const envVars = await this._infrastructureManager.getSettingsForNodeExecution(flow, node);
                logger.trace({nodeId: node.id}, 'Going to deploy a flow node');
                await this._driver.createApp(flow, node, envVars);
            }
        }
    }

    _isRedeployRequired(flow, appsIndex) {
        const flowNodes = flow.nodes || [];
        const flowsVersionChanged = flowNodes.some(node => {
            const app = appsIndex[flow.id] && appsIndex[flow.id][node.id];
            return app && (flow.version !== app.flowVersion);
        });
        const nodesDifference = _.difference(Object.keys(appsIndex[flow.id] || {}), flowNodes.map(node => node.id)).length > 0;

        return flowsVersionChanged || nodesDifference;
    }

    async _getQueuesStructure() {
        const queues = await this._rabbitmqManagement.getQueues();
        const exchanges = await this._rabbitmqManagement.getExchanges();
        const bindings = await this._rabbitmqManagement.getBindings();
        return this._buildMQIndex(queues, exchanges, bindings);
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
            this._logger.trace({flow: flow.id, node: app.id}, 'Going to delete flow node');
            await this._driver.destroyApp(app.id);
        }
    }

    async _removeLostJobs(allApps, allFlows) {
        const flowsIndex = this._buildFlowsIndex(allFlows);
        for (let app of allApps) {
            const flowId = app.flowId;
            const nodeId = app.nodeId;
            if (!flowsIndex[flowId] || !flowsIndex[flowId][nodeId]) {
                await this._driver.destroyApp(app.id);
            }
        }
    }

    _buildFlowsIndex(allFlows) {
        return allFlows.reduce((index, flow) => {
            const flowId = flow.id;
            (flow.nodes || []).forEach((node) => {
                index[flowId] = index[flowId] || {};
                index[flowId][node.id] = node;
            });
            return index;
        }, {});
    }

    _buildMQIndex(queues, exchanges, bindings) {
        const index = {};
        for (let queue of queues) {
            const name = queue.name;
            const flowId = name.split(':')[0];
            index[flowId] = index[flowId] || {queues: [], exchanges: [], bindings: []};
            index[flowId].queues.push(name);
        }
        for (let exchange of exchanges) {
            const flowId = exchange.name;
            index[flowId] = index[flowId] || {queues: [], exchanges: [], bindings: []};
            index[flowId].exchanges.push(exchange.name);
        }
        for (let binding of bindings) {
            const queueName = binding.destination;
            const flowId = queueName.split(':')[0];
            index[flowId] = index[flowId] || {queues: [], exchanges: [], bindings: []};
            index[flowId].bindings.push(binding);
        }
        return index;
    }
}

module.exports = ResourceCoordinator;
