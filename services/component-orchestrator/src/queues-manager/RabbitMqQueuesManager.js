const uuid = require('uuid/v4');
const { URL } = require('url');

const { QueuesManager } = require('@openintegrationhub/component-orchestrator');
const InMemoryCredentialsStorage = require('./credentials-storage/InMemoryCredentialsStorage');
const RabbitMqManagementService = require('./RabbitMqManagementService');

const BACKCHANNEL_EXCHANGE = 'orchestrator_backchannel'
const BACKCHANNEL_MESSAGES_QUEUE = `${BACKCHANNEL_EXCHANGE}:messages`
const BACKCHANNEL_REBOUNDS_QUEUE = `${BACKCHANNEL_EXCHANGE}:rebounds`

const BACKCHANNEL_INPUT_KEY = `${BACKCHANNEL_EXCHANGE}.input`
const BACKCHANNEL_REQUEUE_KEY = `${BACKCHANNEL_EXCHANGE}.requeue`
const BACKCHANNEL_REBOUND_KEY = `${BACKCHANNEL_EXCHANGE}.rebound`
const BACKCHANNEL_DEAD_LETTER_KEY = `${BACKCHANNEL_EXCHANGE}.deadletter`

class RabbitMqQueuesManager extends QueuesManager {
    constructor({ queueCreator, queuePubSub, logger, config, credentialsStorage }) {
        super();
        this._config = config;
        this._logger = logger;
        this._rabbitmqManagement = new RabbitMqManagementService({ config, logger });
        this._queueCreator = queueCreator;
        this._queuePubSub = queuePubSub;
        this._credentialsStorage = credentialsStorage || new InMemoryCredentialsStorage();
    }

    async setupBackchannel() {
        await this._queueCreator.prepareExchange(BACKCHANNEL_EXCHANGE)
        await this._queueCreator.assertMessagesQueue(BACKCHANNEL_MESSAGES_QUEUE, BACKCHANNEL_EXCHANGE, BACKCHANNEL_DEAD_LETTER_KEY);
        await this._queueCreator.assertReboundsQueue(BACKCHANNEL_REBOUNDS_QUEUE, BACKCHANNEL_EXCHANGE, BACKCHANNEL_REQUEUE_KEY);
        await this._queueCreator.bindQueue(BACKCHANNEL_MESSAGES_QUEUE, BACKCHANNEL_EXCHANGE, BACKCHANNEL_INPUT_KEY);
        await this._queueCreator.bindQueue(BACKCHANNEL_MESSAGES_QUEUE, BACKCHANNEL_EXCHANGE, BACKCHANNEL_REQUEUE_KEY);
        await this._queueCreator.bindQueue(BACKCHANNEL_REBOUNDS_QUEUE, BACKCHANNEL_EXCHANGE, BACKCHANNEL_REBOUND_KEY);
    }

    async subscribeBackchannel() {
        this._queuePubSub.subscribe()
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

        this._logger.trace({ username, password }, 'About to create RabbitMQ user');
        // @todo: create node user
        await this._rabbitmqManagement.createFlowUser({
            username,
            password,
            flow,
            backchannel: BACKCHANNEL_EXCHANGE
        });
        this._logger.trace({ username }, 'Created RabbitMQ user');

        const newCreds = { username, password };
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
        this._logger.info({ flowId: flow.id, nodeId: node.id }, 'About to remove credential');
        return this._credentialsStorage.remove(flow.id, node.id);
    }

    async _deleteRabbitMqCredentialsForFlow(flow) {
        const flowCredentials = await this._credentialsStorage.getAllForFlow(flow.id);
        for (const item of flowCredentials) {
            this._logger.trace(item.credential, 'About to delete RabbitMQ credential');
            await this._rabbitmqManagement.deleteUser(item.credential);
            await this._deleteRabbitMqCredential(flow, { id: item.nodeId });
        }
    }

    async _deleteQueuesForFlow(flow) {
        const flowId = flow.id;
        //@todo: Needs optimisation, don't get all queues on every call
        const queuesStructure = await this._getQueuesStructure();
        // delete all queues
        if (queuesStructure[flowId]) {
            for (let queue of queuesStructure[flowId].queues) {
                await this._queueCreator.deleteQueue(queue);
            }
            for (let exchange of queuesStructure[flowId].exchanges) {
                await this._queueCreator.deleteExchange(exchange);
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
            index[flowId] = index[flowId] || { queues: [], exchanges: [], bindings: [] };
            index[flowId].queues.push(name);
        }
        for (let exchange of exchanges) {
            const flowId = exchange.name;
            index[flowId] = index[flowId] || { queues: [], exchanges: [], bindings: [] };
            index[flowId].exchanges.push(exchange.name);
        }
        for (let binding of bindings) {
            const queueName = binding.destination;
            const flowId = queueName.split(':')[0];
            index[flowId] = index[flowId] || { queues: [], exchanges: [], bindings: [] };
            index[flowId].bindings.push(binding);
        }
        return index;
    }
}

module.exports = RabbitMqQueuesManager;
