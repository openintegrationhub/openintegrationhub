const uuid = require('uuid/v4');
const { URL } = require('url');

const { InfrastructureManager } = require('@openintegrationhub/resource-coordinator');

class OIHInfrastructureManager extends InfrastructureManager {
    constructor({ driver, rabbitmqManagement, amqpConnection, queueCreator, logger, config }) {
        super();
        this._config = config;
        this._logger = logger;
        this._driver = driver;
        this._rabbitmqManagement = rabbitmqManagement;
        this._channelPromise = amqpConnection.createChannel();
        this._queueCreator = queueCreator;
    }

    async createForFlow(flow) {
        const amqpCredentials = await this._createFlowAmqpCredentials(flow);
        const secretEnvVars = {
            AMQP_URI: this._prepareAmqpUri(amqpCredentials)
        };
        await this._driver.initFlow(flow, secretEnvVars);
        await this._queueCreator.makeQueuesForTheFlow(flow);
    }

    async updateForFlow(flow, queuesStructure) {
        await this._deleteQueuesForFlow(flow, queuesStructure);
        await this._queueCreator.makeQueuesForTheFlow(flow);
    }

    async deleteForFlow(flow, queuesStructure) {
        await this._deleteQueuesForFlow(flow, queuesStructure);
        await this._deleteFlowAmqpCredentials(flow);
    }

    async getSettingsForNodeExecution(flow, node) {
        //@todo: don't ensure queues every time
        const flowEnvVars = await this._queueCreator.makeQueuesForTheFlow(flow);
        return flowEnvVars[node.id];
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
}

module.exports = OIHInfrastructureManager;
