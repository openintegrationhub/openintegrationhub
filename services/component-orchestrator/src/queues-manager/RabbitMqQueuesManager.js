const { v4 } = require('uuid');
const { URL } = require('url');

const { QueuesManager } = require('@openintegrationhub/component-orchestrator');
const InMemoryCredentialsStorage = require('./credentials-storage/InMemoryCredentialsStorage');
const RabbitMqManagementService = require('./RabbitMqManagementService');

const BACKCHANNEL_EXCHANGE = 'orchestrator_backchannel';
const BACKCHANNEL_MESSAGES_QUEUE = `${BACKCHANNEL_EXCHANGE}:messages`;
const BACKCHANNEL_ERROR_QUEUE = `${BACKCHANNEL_EXCHANGE}:error`;

const BACKCHANNEL_INPUT_KEY = `${BACKCHANNEL_EXCHANGE}.input`;
const BACKCHANNEL_ERROR_KEY = `${BACKCHANNEL_EXCHANGE}.error`;
const BACKCHANNEL_STATE_KEY = `${BACKCHANNEL_EXCHANGE}.step_state`;
// The Step State key is used to handle incoming "end" messages from a component, to handle deletions of execution scoped snapshots.

const BACKCHANNEL_DEAD_LETTER_KEY = `${BACKCHANNEL_EXCHANGE}.deadletter`;

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

    onRecover(newChannel) {
        this._queueCreator.onRecover(newChannel);
        this._queuePubSub.onRecover(newChannel);
    }

    async setupBackchannel() {
        await this._queueCreator.prepareExchange(BACKCHANNEL_EXCHANGE);
        await this._queueCreator.assertMessagesQueue(
            BACKCHANNEL_MESSAGES_QUEUE,
            BACKCHANNEL_EXCHANGE,
            BACKCHANNEL_DEAD_LETTER_KEY
        );
        await this._queueCreator.assertMessagesQueue(
            BACKCHANNEL_ERROR_QUEUE,
            BACKCHANNEL_EXCHANGE,
            BACKCHANNEL_DEAD_LETTER_KEY
        );
        await this._queueCreator.bindQueue(BACKCHANNEL_MESSAGES_QUEUE, BACKCHANNEL_EXCHANGE, BACKCHANNEL_INPUT_KEY);
        await this._queueCreator.bindQueue(BACKCHANNEL_MESSAGES_QUEUE, BACKCHANNEL_EXCHANGE, BACKCHANNEL_STATE_KEY);
        await this._queueCreator.bindQueue(BACKCHANNEL_ERROR_QUEUE, BACKCHANNEL_EXCHANGE, BACKCHANNEL_ERROR_KEY);
    }

    async subscribeBackchannel(callback) {
        const processCallback = async (message) => {
            await callback(message);
            await this._queuePubSub.ack(message);
        };
        return this._queuePubSub.subscribe(BACKCHANNEL_MESSAGES_QUEUE, processCallback.bind(this));
    }

    async subscribeErrorQueue(callback) {
        const processCallback = async (message) => {
            await callback(message);
            await this._queuePubSub.ack(message);
        };
        return this._queuePubSub.subscribe(BACKCHANNEL_ERROR_QUEUE, processCallback.bind(this));
    }

    async deleteForFlow(flow) {
        await this._deleteQueuesForFlow(flow);
        await this._deleteRabbitMqCredentialsForFlow(flow);
    }

    async deleteForGlobalComponent(component) {
        await this._deleteQueuesForGlobalComponent(component);
        await this._deleteRabbitMqCredentialForGlobalComponent(component);
    }

    async prepareQueues(flow, components) {
        return await this._queueCreator.makeQueuesForTheFlow(flow, components);
    }

    async getSettingsForNodeExecution(flow, node, flowSettings) {
        //@todo: don't ensure queues every time
        const rabbitCredentials = await this._ensureRabbitMqCredentialsForFlowNode(flow, node);
        const AMQP_URI = this._prepareAmqpUri(rabbitCredentials);

        const stepSettings = flowSettings[node.id] || {};
        Object.assign(stepSettings, {
            AMQP_URI,
        });

        return stepSettings;
    }

    async ensureCredentials(globalComponent, flow, node) {
        await this._ensureRabbitMqCredentials(globalComponent, flow, node, true);
    }

    async getExistingCredentialIdentifiers() {
        return this._credentialsStorage.getIdentifiers();
    }

    async prepareQueuesForGlobalComponent(component) {
        return await this._queueCreator.createQueuesForGlobalComponent(component);
    }

    async getSettingsForGlobalComponent(component, settings) {
        //@todo: don't ensure queues every time
        const rabbitCredentials = await this._ensureRabbitMqCredentialsForGlobalComponent(component);
        const AMQP_URI = this._prepareAmqpUri(rabbitCredentials);

        Object.assign(settings, {
            AMQP_URI,
        });

        return settings;
    }

    _prepareAmqpUri({ username, password }) {
        const baseUri = new URL(this._config.get('RABBITMQ_URI_FLOWS'));
        baseUri.username = username;
        baseUri.password = password;

        return baseUri.toString();
    }

    async _ensureRabbitMqCredentials(globalComponent, flow, node, forcePut = false) {
        const type = globalComponent ? 'global' : 'local';

        let creds = null;
        let username = null;
        let password = null;

        if (type === 'local') {
            creds = await this._getRabbitMqCredential(flow, node);
        } else {
            creds = await this._getRabbitMqCredentialForGlobalComponent(globalComponent);
        }

        if (!creds || forcePut) {
            password = creds ? creds.password : v4();

            if (type === 'local') {
                username = creds
                    ? creds.username
                    : `flow-${flow.id}-${node.id}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
                await this._rabbitmqManagement.createFlowUser({
                    username,
                    password,
                    flow,
                    backchannel: BACKCHANNEL_EXCHANGE,
                });
            } else {
                username = creds
                    ? creds.username
                    : `component-${globalComponent.id}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
                await this._rabbitmqManagement.createGlobalComponentUser({
                    username,
                    password,
                    component: globalComponent,
                    backchannel: BACKCHANNEL_EXCHANGE,
                });
            }
            this._logger.trace({ username }, 'Upserted RabbitMQ user');
        }

        if (creds) return creds;

        const newCreds = { username, password };

        if (type === 'local') {
            await this._saveRabbitMqCredential(flow, node, newCreds);
        } else {
            await this._saveRabbitMqCredentialForGlobalComponent(globalComponent, newCreds);
        }

        return newCreds;
    }

    async _ensureRabbitMqCredentialsForFlowNode(flow, node, forcePut) {
        return this._ensureRabbitMqCredentials(null, flow, node, forcePut);
    }

    async _ensureRabbitMqCredentialsForGlobalComponent(component, forcePut) {
        return this._ensureRabbitMqCredentials(component, null, null, forcePut);
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
        await this._deleteQueues(selector);
    }

    async _deleteQueuesForGlobalComponent(component) {
        const selector = `component-${component.id}`;
        await this._deleteQueues(selector);
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
