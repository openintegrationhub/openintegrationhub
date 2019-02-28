const uuid = require('uuid/v4');
const { URL } = require('url');

const { QueuesManager } = require('@openintegrationhub/resource-coordinator');
const InMemoryCredentialsStorage = require('./credentials-storage/InMemoryCredentialsStorage');

class RabbitMqQueuesManager extends QueuesManager {
    constructor({ rabbitmqManagement, amqpConnection, queueCreator, logger, config, credentialsStorage }) {
        super();
        this._config = config;
        this._logger = logger;
        this._rabbitmqManagement = rabbitmqManagement;
        this._channelPromise = amqpConnection.createChannel();
        this._queueCreator = queueCreator;
        this._credentialsStorage = credentialsStorage || new InMemoryCredentialsStorage();
    }

    async createForFlow(flow) {
        return await this._queueCreator.makeQueuesForTheFlow(flow);
    }

    async updateForFlow(flow) {
        await this._deleteQueuesForFlow(flow);
        await this._queueCreator.makeQueuesForTheFlow(flow);
    }

    async deleteForFlow(flow) {
        await this._deleteQueuesForFlow(flow);
        await this._deleteRabbitMqCredentialsForFlow(flow);
    }

    async getSettingsForNodeExecution(flow, node) {
        //@todo: don't ensure queues every time
        const flowSettings = await this._queueCreator.makeQueuesForTheFlow(flow);
        const rabbitCredentials = await this._ensureRabbitMqCredentialsForFlowNode(flow, node);
        const AMQP_URI = this._prepareAmqpUri(rabbitCredentials);

        const stepSettings = flowSettings[node.id] || {};
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

    async _ensureRabbitMqCredentialsForFlowNode(flow, node) {
        const creds = await this._getRabbitMqCredential(flow, node);
        if (creds) {
            this._logger.trace(creds, 'Found created credentials');
            return creds;
        }

        const username = `${flow.id}_${node.id}`.toLowerCase().replace(/[^a-z0-9]/g, '');
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
        await this._saveRabbitMqCredential(flow, node, newCreds);

        return newCreds;
    }

    _getRabbitMqCredential(flow, node) {
        return this._credentialsStorage.get(flow.id, node.id);
    }

    _saveRabbitMqCredential(flow, node, credential) {
        return this._credentialsStorage.set(flow.id, node.id, credential);
    }

    _deleteRabbitMqCredential(flow, node) {
        this._logger.info({flowId: flow.id, nodeId: node.id}, 'About to remove credential');
        return this._credentialsStorage.remove(flow.id, node.id);
    }

    async _deleteRabbitMqCredentialsForFlow(flow) {
        const flowCredentials = await this._credentialsStorage.getAllForFlow(flow.id);
        for (const item of flowCredentials) {
            this._logger.trace(item.credential, 'About to delete RabbitMQ credential');
            await this._rabbitmqManagement.deleteUser(item.credential);
            await this._deleteRabbitMqCredential(flow, {id: item.nodeId});
        }
    }

    async _deleteQueuesForFlow(flow) {
        const flowId = flow.id;
        //@todo: Needs optimisation, don't get all queues on every call
        const queuesStructure = await this._getQueuesStructure();
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

    async _getQueuesStructure() {
        const queues = await this._rabbitmqManagement.getQueues();
        const exchanges = await this._rabbitmqManagement.getExchanges();
        const bindings = await this._rabbitmqManagement.getBindings();
        return this._buildMQIndex(queues, exchanges, bindings);
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

module.exports = RabbitMqQueuesManager;
