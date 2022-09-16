const util = require('util');

const REBOUND_QUEUE_TTL = 10 * 60 * 1000; // 10 min

const INPUT_TAG = 'input';
const ERROR_TAG = 'error';
const REBOUND_TAG = 'rebound';
const REQUEUE_TAG = 'requeue';
const DEAD_LETTER_TAG = 'deadletter';
const SNAPSHOT_TAG = 'snapshot';

const MESSAGES_QUEUE_SUFFIX = 'messages';
const REBOUNDS_QUEUE_SUFFIX = 'rebounds';


function getFlowIdForQueue(flow) {
    return flow.id;
}

function getRoutingKeySuffixForFlow(flow, baseSuffix) {
    return baseSuffix;
}

function getQueueName(params) {
    const { flow, stepId, suffix } = params;
    const flowId = getFlowIdForQueue(flow);
    return `flow-${flowId}:${stepId}:${suffix}`;
}


function getFlowExchange(flow) {
    return `flow-${flow.id}`;
}

function getRoutingTag(params) {
    const { flow, stepId, suffix } = params;
    const flowId = getFlowIdForQueue(flow);
    return `flow-${flowId}.${stepId}.${suffix}`;
}


function getMessagesQueue(flow, stepId) {
    return getQueueName({
        flow,
        stepId,
        suffix: MESSAGES_QUEUE_SUFFIX
    });
}

function getReboundsQueue(flow, stepId) {
    return getQueueName({
        flow,
        stepId,
        suffix: REBOUNDS_QUEUE_SUFFIX
    });
}

function getInputRoutingKey(flow, stepId) {
    const suffix = getRoutingKeySuffixForFlow(flow, INPUT_TAG);
    return getRoutingTag({
        flow,
        stepId,
        suffix
    });
}

function getErrorRoutingKey(flow, stepId) {
    const suffix = getRoutingKeySuffixForFlow(flow, ERROR_TAG);
    return getRoutingTag({
        flow,
        stepId,
        suffix
    });
}

function getReboundRoutingKey(flow, stepId) {
    return getRoutingTag({
        flow,
        stepId,
        suffix: REBOUND_TAG
    });
}

function getRequeueRoutingKey(flow, stepId) {
    return getRoutingTag({
        flow,
        stepId,
        suffix: REQUEUE_TAG
    });
}

function getDeadLetterRoutingKey(flow, stepId) {
    return getRoutingTag({
        flow,
        stepId,
        suffix: DEAD_LETTER_TAG
    });
}

function getSnapshotRoutingKey(flow, stepId) {
    return getRoutingTag({
        flow,
        stepId,
        suffix: SNAPSHOT_TAG
    });
}

function processError() {
    const prefix = util.format.apply(null, arguments);
    return function rethrow(err) {
        err.message = prefix + ': ' + err.message;
        throw err;
    };
}

/**
 * @typedef {Object} QueueSteps
 * @property {String} LISTEN_MESSAGES_ON
 * @property {String} PUBLISH_MESSAGES_TO
 * @property {String} ERROR_ROUTING_KEY
 * @property {String} SNAPSHOT_ROUTING_KEY
 * @property {String} REBOUND_ROUTING_KEY
 * @property {String} OUTPUT_ROUTING_KEY
 */

class QueueCreator {
    constructor(channel) {
        this.channel = channel;
    }

    async assertExchange(exchangeName) {
        const type = 'topic';
        const options = {
            durable: true,
            autoDelete: false
        };

        try {
            await this.channel.assertExchange(exchangeName, type, options);
        } catch (err) {
            processError('Failed to assert exchange "%s"', exchangeName)(err);
        }
    }

    async assertQueue(queueName, options) {
        try {
            await this.channel.assertQueue(queueName, options);
        } catch (err) {
            processError('Failed to assert queue "%s"', queueName)(err);
        }
    }

    async assertMessagesQueue(queueName, deadLetterExchange, deadLetterKey) {
        const options = {
            durable: true,
            autoDelete: false,
            arguments: {
                'x-dead-letter-exchange': deadLetterExchange,
                'x-dead-letter-routing-key': deadLetterKey
            }
        };

        try {
            await this.channel.assertQueue(queueName, options);
        } catch (err) {
            processError('Failed to assert queue "%s"', queueName)(err);
        }
    }

    async assertReboundsQueue(queueName, returnToExchange, returnWithKey) {
        const options = {
            durable: true,
            autoDelete: false,
            arguments: {
                'x-message-ttl': REBOUND_QUEUE_TTL,
                'x-dead-letter-exchange': returnToExchange, // send dead rebounded queues back to exchange
                'x-dead-letter-routing-key': returnWithKey // with tag as message
            }
        };

        try {
            await this.channel.assertQueue(queueName, options);
        } catch (err) {

            processError('Failed to assert queue "%s"', queueName)(err);
        }
    }

    async bindQueue(queueName, exchangeName, routingKey) {
        try {
            await this.channel.bindQueue(queueName, exchangeName, routingKey);
        } catch (err) {
            processError('Failed to bind queue "%s" to key "%s"', queueName, routingKey)(err);
        }
    }

    async bindExchange(destination, source, pattern) {
        try {
            await this.channel.bindExchange(destination, source, pattern);
        } catch (err) {
            processError('Failed to bind exchange from "%s" to "%s"', source, destination)(err);
        }
    }

    async deleteQueue(queueName) {
        try {
            await this.channel.deleteQueue(queueName);
        } catch (err) {
            processError('Failed to delete queue "%s"', queueName)(err);
        }
    }

    async deleteExchange(queueName) {
        try {
            await this.channel.deleteExchange(queueName);
        } catch (err) {
            processError('Failed to delete queue "%s"', queueName)(err);
        }
    }

    /**
     * Create all queues required to run the flow including all its steps
     * @param {Flow} flow
     * @returns {Promise<Object<String: QueueSteps>>} key-value pairs. Key is step identifier
     * value is table of queues for this step
     */
    async makeQueuesForTheFlow(flow, components) {
        await this.prepareExchangeForFlow(flow);

        const traverseSubtree = async (flow, node, parentNode, result = {}) => {
            if (typeof node === 'string') {
                node = await flow.getNodeById(node);
            }
            const component = components[node.componentId]
            const outgoingConnections = (flow.graph.edges || []).filter(c => c.source === node.id);

            if (!component.isGlobal)
                result[node.id] = await this.createQueuesForFlowNode(flow, node, parentNode, !!outgoingConnections.length);



            if (!outgoingConnections.length > 0) return result;

            await Promise.all(outgoingConnections.map(conn => traverseSubtree(flow, conn.target, node, result)));
            return result;
        };
        return await traverseSubtree(flow, await flow.getFirstNode());
    }

    async prepareExchange(exchange) {
        await this.assertExchange(exchange);
    }

    async prepareExchangeForFlow(flow) {
        const userExchange = getFlowExchange(flow);

        await this.assertExchange(userExchange);
        await this.assertExchange(this.constructor.COLLECTOR_EXCHANGE);
        await this.bindExchange(this.constructor.COLLECTOR_EXCHANGE, userExchange, '#');

        return userExchange;
    }

    getAmqpStepConfig(flow, stepId) {
        return {
            exchangeName: getFlowExchange(flow),
            messagesQueue: getMessagesQueue(flow, stepId),
            reboundsQueue: getReboundsQueue(flow, stepId),
            inputRoutingKey: getInputRoutingKey(flow, stepId),
            errorRoutingKey: getErrorRoutingKey(flow, stepId),
            reboundRoutingKey: getReboundRoutingKey(flow, stepId),
            snapshotRoutingKey: getSnapshotRoutingKey(flow, stepId),
            requeueRoutingKey: getRequeueRoutingKey(flow, stepId),
            deadLetterRoutingKey: getDeadLetterRoutingKey(flow, stepId)
        };
    }

    /**
     * @returns {QueueSteps}
     */
    async createQueuesForFlowNode(flow, node) {
        const stepId = node.id;

        const {
            exchangeName,
            messagesQueue,
            reboundsQueue,
            reboundRoutingKey,
            // errorRoutingKey,
            inputRoutingKey,
            requeueRoutingKey,
            snapshotRoutingKey,
            deadLetterRoutingKey
        } = this.getAmqpStepConfig(flow, stepId);

        // create queues for messages, errors, rebounds
        await this.assertMessagesQueue(messagesQueue, exchangeName, deadLetterRoutingKey);
        await this.assertReboundsQueue(reboundsQueue, exchangeName, requeueRoutingKey);

        // subscribe queues for their tags
        await this.bindQueue(messagesQueue, exchangeName, inputRoutingKey);
        await this.bindQueue(messagesQueue, exchangeName, requeueRoutingKey);
        await this.bindQueue(reboundsQueue, exchangeName, reboundRoutingKey);

        // bind to backchannel queue
        await this.bindQueue('orchestrator_backchannel:messages', 'orchestrator_backchannel', 'orchestrator_backchannel.rebound');

        return {
            LISTEN_MESSAGES_ON: messagesQueue,
            NODE_EXCHANGE: exchangeName,
            BACKCHANNEL_EXCHANGE: 'orchestrator_backchannel',
            ERROR_ROUTING_KEY: 'orchestrator_backchannel.error',
            STATE_ROUTING_KEY: 'orchestrator_backchannel.step_state',
            SNAPSHOT_ROUTING_KEY: snapshotRoutingKey,
            REBOUND_ROUTING_KEY: reboundRoutingKey,
            OUTPUT_ROUTING_KEY: 'orchestrator_backchannel.input'
        };
    }

    async prepareExchangeForGlobalComponent(exchange) {
        await this.assertExchange(exchange);
        await this.assertExchange(this.constructor.COLLECTOR_EXCHANGE);
        await this.bindExchange(this.constructor.COLLECTOR_EXCHANGE, exchange, '#');

        return exchange;
    }

    getAmqpGlobalStepConfig(component) {
        const exchangeName = `component-${component.id}`;
        return {
            exchangeName,
            messagesQueue: `${exchangeName}:messages`,
            reboundsQueue: `${exchangeName}:rebounds`,
            inputRoutingKey: `${exchangeName}.input`,
            reboundRoutingKey: `${exchangeName}.rebound`,
            requeueRoutingKey: `${exchangeName}.requeue`,
            snapshotRoutingKey: `${exchangeName}.snapshot`,
            errorRoutingKey: `${exchangeName}.error`,
            deadLetterRoutingKey: `${exchangeName}.deadletter`,
        };
    }

    async createQueuesForGlobalComponent(component) {
        const {
            exchangeName,
            messagesQueue,
            reboundsQueue,
            reboundRoutingKey,
            // errorRoutingKey,
            inputRoutingKey,
            requeueRoutingKey,
            snapshotRoutingKey,
            deadLetterRoutingKey
        } = this.getAmqpGlobalStepConfig(component);

        await this.prepareExchangeForGlobalComponent(exchangeName)
        // create queues for messages, errors, rebounds
        await this.assertMessagesQueue(messagesQueue, exchangeName, deadLetterRoutingKey);
        await this.assertReboundsQueue(reboundsQueue, exchangeName, requeueRoutingKey);

        // subscribe queues for their tags
        await this.bindQueue(messagesQueue, exchangeName, inputRoutingKey);
        await this.bindQueue(messagesQueue, exchangeName, requeueRoutingKey);
        await this.bindQueue(reboundsQueue, exchangeName, reboundRoutingKey);

        // bind to backchannel queue
        await this.bindQueue('orchestrator_backchannel:messages', 'orchestrator_backchannel', 'orchestrator_backchannel.rebound');

        return {
            LISTEN_MESSAGES_ON: messagesQueue,
            NODE_EXCHANGE: exchangeName,
            BACKCHANNEL_EXCHANGE: 'orchestrator_backchannel',
            ERROR_ROUTING_KEY: 'orchestrator_backchannel.error',
            STATE_ROUTING_KEY: 'orchestrator_backchannel.step_state',
            SNAPSHOT_ROUTING_KEY: snapshotRoutingKey,
            REBOUND_ROUTING_KEY: reboundRoutingKey,
            OUTPUT_ROUTING_KEY: 'orchestrator_backchannel.input'
        };
    }


    static get COLLECTOR_EXCHANGE() {
        return 'component-events-collector';
    }
}

module.exports = QueueCreator;
