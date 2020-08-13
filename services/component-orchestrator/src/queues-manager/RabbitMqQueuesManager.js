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

    async subscribeBackchannel(callback) {
        const processCallback = async (message) => {
            await callback(message)
            await this._queuePubSub.ack(message)
        }
        this._queuePubSub.subscribe(BACKCHANNEL_MESSAGES_QUEUE, processCallback.bind(this))
    }

    async deleteForFlow(flow) {
        await this._deleteQueuesForFlow(flow);
        await this._deleteRabbitMqCredentialsForFlow(flow);
    }

    async deleteForGlobalComponent(component) {
        await this._deleteQueuesForGlobalComponent(component);
        await this._deleteRabbitMqCredentialForGlobalComponent(component);
    }

    async prepareQueues(flow, componentsMap) {
        return await this._queueCreator.makeQueuesForTheFlow(flow, componentsMap);
    }

    async getSettingsForNodeExecution(flow, node, flowSettings) {
        //@todo: don't ensure queues every time
        const rabbitCredentials = await this._ensureRabbitMqCredentialsForFlowNode(flow, node);
        const AMQP_URI = this._prepareAmqpUri(rabbitCredentials);

        const stepSettings = flowSettings[node.id] || {};
        Object.assign(stepSettings, {
            AMQP_URI
        });

        return stepSettings;
    }

    async prepareQueuesForGlobalComponent(component) {
        return await this._queueCreator.createQueuesForGlobalComponent(component);
    }

    async getSettingsForGlobalComponent(component, settings) {
        //@todo: don't ensure queues every time
        const rabbitCredentials = await this._ensureRabbitMqCredentialsForGlobalComponent(component);
        const AMQP_URI = this._prepareAmqpUri(rabbitCredentials);

        Object.assign(settings, {
            AMQP_URI
        });

        return settings;
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

        const username = `flow-${flow.id}-${node.id}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
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

    async _ensureRabbitMqCredentialsForGlobalComponent(component) {
        const creds = await this._getRabbitMqCredentialForGlobalComponent(component);
        if (creds) {
            this._logger.trace(creds, 'Found created credentials');
            return creds;
        }

        const username = `component-${component.id}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
        const password = uuid();

        this._logger.trace({ username, password }, 'About to create RabbitMQ user');
        // @todo: create node user
        await this._rabbitmqManagement.createGlobalComponentUser({
            username,
            password,
            component,
            backchannel: BACKCHANNEL_EXCHANGE
        });
        this._logger.trace({ username }, 'Created RabbitMQ user');

        const newCreds = { username, password };
        await this._saveRabbitMqCredentialForGlobalComponent(component, newCreds);

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

    _getRabbitMqCredentialForGlobalComponent(component) {
        return this._credentialsStorage.getForGlobalComponent(component.id);
    }

    _saveRabbitMqCredentialForGlobalComponent(component, credential) {
        return this._credentialsStorage.setForGlobalComponent(component.id, credential);
    }

    async _deleteRabbitMqCredentialForGlobalComponent(component) {
        this._logger.info({ componentId: component.id }, 'About to remove credential');
        await this._rabbitmqManagement.deleteUser({ username: `component-${component.id}` });
        return this._credentialsStorage.removeForGlobalComponent(component.id);
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
        const selector = `flow-${flow.id}`;
        await this._deleteQueues(selector)
    }

    async _deleteQueuesForGlobalComponent(component) {
        const selector = `component-${component.id}`;
        await this._deleteQueues(selector)
    }


    async _deleteQueues(selector) {
        //@todo: Needs optimisation, don't get all queues on every call
        const queuesStructure = await this._getQueuesStructure();
        // delete all queues
        if (queuesStructure[selector]) {

            for (let queue of queuesStructure[selector].queues) {
                await this._queueCreator.deleteQueue(queue);
            }
            for (let exchange of queuesStructure[selector].exchanges) {

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
            const selector = name.split(':')[0];
            index[selector] = index[selector] || { queues: [], exchanges: [], bindings: [] };
            index[selector].queues.push(name);
        }
        for (let exchange of exchanges) {
            const selector = exchange.name;
            index[selector] = index[selector] || { queues: [], exchanges: [], bindings: [] };
            index[selector].exchanges.push(exchange.name);
        }
        for (let binding of bindings) {
            const queueName = binding.destination;
            const selector = queueName.split(':')[0];
            index[selector] = index[selector] || { queues: [], exchanges: [], bindings: [] };
            index[selector].bindings.push(binding);
        }
        return index;
    }
}

module.exports = RabbitMqQueuesManager;
