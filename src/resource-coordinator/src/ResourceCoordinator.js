//@see https://github.com/kubernetes/community/blob/master/contributors/devel/api-conventions.md
const uuid = require('uuid/v4');
const _ = require('lodash');
const { URL } = require('url');

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
    constructor(config, logger, queueCreator, rabbitmqManagement, amqpConnection, flowsDao, driver) {
        this._logger = logger.child({service: 'ResourceCoordinator'});
        this._queueCreator = queueCreator;
        this._rabbitmqManagement = rabbitmqManagement;
        this._config = config;
        this._channelPromise = amqpConnection.createChannel();
        this._flowsDao = flowsDao;
        this._driver = driver;
    }

    start() {
        loop(this._loopBody.bind(this), this._logger, 5000);
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
        const appsIndex = this._buildJobIndex(allApps);
        for (let flow of flows) {
            await this._handleFlow(flow, appsIndex, queuesStructure);
        }
        await this._removeLostJobs(allApps, flows);
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

    async _handleFlow(flow, appsIndex, queuesStructure) {
        const flowId = flow.id;

        // if flow is deleted
        if (flow.isDeleted) {
            this._logger.trace({name: flow.id}, 'Going to delete flow');

            await this._deleteRunningAppsForFlow(flow, appsIndex);
            await this._deleteQueuesForFlow(flow, queuesStructure);
            await this._deleteFlowAmqpCredentials(flow);

            await this._flowsDao.removeFinalizer(flow); //@todo: onFlowDeleted?
        } else {
            // ensure flow infrastructure - finalizer + secret + queues
            await this._flowsDao.ensureFinalizer(flow); //@todo: onFlowCreated?

            //@todo ensure queues/exchanges. Use QueuesStructure table
            const flowEnvVars =  await this._queueCreator.makeQueuesForTheFlow(flow);
            const amqpCredentials = await this._createFlowAmqpCredentials(flow);
            const secretEnvVars = {
                AMQP_URI: this._prepareAmqpUri(amqpCredentials)
            };
            this._logger.trace({name: flow.id}, 'Nothing changed.');

            for (let node of flow.nodes) {
                if (!appsIndex[flowId] || !appsIndex[flowId][node.id]) {
                    this._logger.trace({flow: flow.id, node: node.id}, 'Going to create a flow node');
                    await this._driver.createApp(flow, node, flowEnvVars[node.id], secretEnvVars);
                }
            }
        }
    }

    async _totalRedeploy(flow, appsIndex, queuesStructure) {
        const flowId = flow.id;

        let totalRedeploy = Object.keys(flow.nodes).some((nodeId) => {
            const app = appsIndex[flowId] && appsIndex[flowId][nodeId];
            return app && (flow.version !== app.flowVersion);
        });
        totalRedeploy = totalRedeploy || _.difference(Object.keys(appsIndex[flowId] || {}), (flow.nodes || []).map(node=>node.id)).length > 0;

        if (totalRedeploy) {
            this._logger.trace({name: flow.id}, 'Flow changed. Redeploy');
            await this._deleteRunningAppsForFlow(flow, appsIndex);
            await this._deleteQueuesForFlow(flow, queuesStructure); // delete all queues? really?

            const queues = await this._queueCreator.makeQueuesForTheFlow(flow);
            for (let node of flow.nodes) {
                this._logger.trace({flow: flow.id, node: node.id}, 'Going to create flow node');
                await this._driver.createApp(flow, node, queues[node.id]);
            }
        }
    }

    async _deleteQueuesForFlow(flow, queuesStructure) {
        const flowId = flow.id;
        // delete all queues
        if (queuesStructure[flowId]) {
            const channel = await this._channelPromise;
            for (let queue of queuesStructure[flowId].queues) {
                await channel.deleteQueue(queue);
            }
            for (let exchange of queuesStructure[flowId].exchanges) {
                await channel.deleteExchange(exchange);
            }
        }
    }

    async _deleteRunningAppsForFlow(flow, appsIndex) {
        const flowId = flow.id;
        // delete all containers
        for (let app of Object.values(appsIndex[flowId] || {})) {
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

    _prepareAmqpUri({ username, password }) {
        const baseUri = new URL(this._config.get('RABBITMQ_URI_FLOWS'));
        baseUri.username = username;
        baseUri.password = password;

        return baseUri.toString();
    }

    _createFlowAmqpCredentials(flow) {
        return this._createAmqpCredentials(flow);
    }

    async _createAmqpCredentials(flow) {
        const username = flow.id;
        const password = uuid();

        this._logger.trace('About to create RabbitMQ user');
        await this._rabbitmqManagement.createFlowUser({
            username,
            password,
            flow
        });
        this._logger.trace('Created RabbitMQ user');

        return {
            username,
            password
        };
    }

    _deleteFlowAmqpCredentials(flow) {
        return this._deleteAmqpCredentials({username: flow.id});
    }

    _deleteAmqpCredentials(credentials) {
        return this._rabbitmqManagement.deleteUser(credentials);
    }
}

module.exports = ResourceCoordinator;
