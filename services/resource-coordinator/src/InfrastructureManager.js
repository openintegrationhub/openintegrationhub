const uuid = require('uuid/v4');
const { URL } = require('url');
const _ = require('lodash');

const { InfrastructureManager } = require('@openintegrationhub/resource-coordinator');

class RabbitMqInfrastructureManager extends InfrastructureManager {
    constructor({ rabbitmqManagement, amqpConnection, queueCreator, logger, config }) {
        super();
        this._config = config;
        this._logger = logger;
        this._rabbitmqManagement = rabbitmqManagement;
        this._channelPromise = amqpConnection.createChannel();
        this._queueCreator = queueCreator;
        this._credentialsStore = {};
    }

    async createForFlow(flow) {
        return await this._queueCreator.makeQueuesForTheFlow(flow);
    }

    async updateForFlow(flow, queuesStructure) {
        await this._deleteQueuesForFlow(flow, queuesStructure);
        await this._queueCreator.makeQueuesForTheFlow(flow);
    }

    async deleteForFlow(flow, queuesStructure) {
        await this._deleteQueuesForFlow(flow, queuesStructure);
        await this._deleteRabbitMqCredentialsForFlow(flow);
    }

    async getSettingsForNodeExecution(flow, node) {
        //@todo: don't ensure queues every time
        const flowSettings = await this._queueCreator.makeQueuesForTheFlow(flow);
        const rabbitCredentials = await this._getRabbitMqCredentialsForFlowNode(flow, node);
        const AMQP_URI = this._prepareAmqpUri(rabbitCredentials);

        const stepSettings = flowSettings[node.id];
        Object.assign(stepSettings, {
            AMQP_URI
        });

        return stepSettings;
    }

    _prepareAmqpUri({ username, password }) {
        const baseUri = new URL(this._config.get('RABBITMQ_URI_FLOWS'));
        baseUri.username = username;
        baseUri.password = password;

        return baseUri.toString();
    }

    async _getRabbitMqCredentialsForFlowNode(flow, node) {
        const creds = this._getRabbitMqCredentials(flow, node);
        if (creds) {
            this._logger.trace(creds, 'Found created credentials');
            return creds;
        }

        const username = `${flow.id}_${node.id}`.replace(/[^\w\d]/g, '');
        const password = uuid();

        this._logger.trace({username, password}, 'About to create RabbitMQ user');
        // @todo: create node user
        await this._rabbitmqManagement.createFlowUser({
            username,
            password,
            flow
        });
        this._logger.trace({username}, 'Created RabbitMQ user');

        const newCreds = {username, password};
        this._saveRabbitMqCredentials(flow, node, newCreds);

        return newCreds;
    }

    _getRabbitMqCredentials(flow, node) {
        return _.get(this._credentialsStore, [flow.id, node.id]);
    }

    _saveRabbitMqCredentials(flow, node, credentials) {
        this._credentialsStore[flow.id] = this._credentialsStore[flow.id] || {};
        this._credentialsStore[flow.id][node.id] = credentials;
    }

    async _deleteRabbitMqCredentialsForFlow(flow) {
        const flowCredentials = this._credentialsStore[flow.id] || {};
        for (const [nodeId, credentials] of Object.entries(flowCredentials)) {
            this._logger.trace(credentials, 'About to delete RabbitMQ credential');
            await this._rabbitmqManagement.deleteUser(credentials);
            delete this._credentialsStore[flow.id][nodeId];
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
}

module.exports = RabbitMqInfrastructureManager;
