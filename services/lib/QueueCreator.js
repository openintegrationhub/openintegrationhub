const util = require('util');

const REBOUND_QUEUE_TTL = 10 * 60 * 1000; // 10 min
const MESSAGE_TAG = 'message';
const INPUT_TAG = 'input';
const ERROR_TAG = 'error';
const REBOUND_TAG = 'rebound';
const REQUEUE_TAG = 'requeue';
const DEAD_LETTER_TAG = 'deadletter';
const SNAPSHOT_TAG = 'snapshot';

const MESSAGES_QUEUE_SUFFIX = 'messages';
const REBOUNDS_QUEUE_SUFFIX = 'rebounds';


function getTaskIdForQueue(task) {
    return task.id;
}

function getRoutingKeySuffixForTask(task, baseSuffix) {
    return baseSuffix;
}

function getQueueName(params) {
    const { task, stepId, suffix } = params;
    const taskId = getTaskIdForQueue(task);
    return `${taskId}:${stepId}:${suffix}`;
}


function getTaskExchange(task) {
    return task.id;
}

function getRoutingTag(params) {
    const { task, stepId, suffix } = params;
    const taskId = getTaskIdForQueue(task);
    return `${taskId}.${stepId}.${suffix}`;
}


function getMessagesQueue(task, stepId) {
    return getQueueName({
        task,
        stepId,
        suffix: MESSAGES_QUEUE_SUFFIX
    });
}

function getReboundsQueue(task, stepId) {
    return getQueueName({
        task,
        stepId,
        suffix: REBOUNDS_QUEUE_SUFFIX
    });
}

function getDataRoutingKey(task, stepId) {
    const suffix = getRoutingKeySuffixForTask(task, MESSAGE_TAG);
    return getRoutingTag({
        task,
        stepId,
        suffix
    });
}

function getInputRoutingKey(task, stepId) {
    const suffix = getRoutingKeySuffixForTask(task, INPUT_TAG);
    return getRoutingTag({
        task,
        stepId,
        suffix
    });
}

function getErrorRoutingKey(task, stepId) {
    const suffix = getRoutingKeySuffixForTask(task, ERROR_TAG);
    return getRoutingTag({
        task,
        stepId,
        suffix
    });
}

function getReboundRoutingKey(task, stepId) {
    return getRoutingTag({
        task,
        stepId,
        suffix: REBOUND_TAG
    });
}

function getRequeueRoutingKey(task, stepId) {
    return getRoutingTag({
        task,
        stepId,
        suffix: REQUEUE_TAG
    });
}

function getDeadLetterRoutingKey(task, stepId) {
    return getRoutingTag({
        task,
        stepId,
        suffix: DEAD_LETTER_TAG
    });
}

function getSnapshotRoutingKey(task, stepId) {
    return getRoutingTag({
        task,
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
 * @property {String} DATA_ROUTING_KEY
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

    async deleteQueue(queueName) {
        try {
            await this.channel.deleteQueue(queueName);
        } catch (err) {
            processError('Failed to delete queue "%s"', queueName)(err);
        }
    }

    /**
     * Create all queues requied to run the task including all its steps
     * @param {Task}
     * @returns {Promise<Object<String: QueueSteps>>} key-value pairs. Key is step identifier
     * value is table of queues for this step
     */
    async makeQueuesForTheTask(task) {
        await this.prepareExchangeForTask(task);

        const traverseSubtree = async (task, node, parentNode, result = {}) => {
            if (typeof node === 'string') {
                node = await task.getRecipeNodeByStepId(node);
            }
            //eslint-disable-next-line no-invalid-this
            result[node.id] = await this.createQueuesForTaskNode(task, node, parentNode);

            const outgoingConnections = (task.connections || []).filter(c => c.from === node.id);

            if (!outgoingConnections.length > 0) {
                return result;
            }

            //eslint-disable-next-line no-invalid-this
            await Promise.all(outgoingConnections.map(conn => traverseSubtree(task, conn.to, node, result)));
            return result;
        };
        return await traverseSubtree(task, task.getFirstNode());
    }

    async prepareExchangeForTask(task) {
        const userExchange = getTaskExchange(task);

        await this.assertExchange(userExchange);

        return userExchange;
    }

    getAmqpStepConfig(task, stepId) {
        return {
            exchangeName: getTaskExchange(task),
            messagesQueue: getMessagesQueue(task, stepId),
            reboundsQueue: getReboundsQueue(task, stepId),
            dataRoutingKey: getDataRoutingKey(task, stepId),
            inputRoutingKey: getInputRoutingKey(task, stepId),
            errorRoutingKey: getErrorRoutingKey(task, stepId),
            reboundRoutingKey: getReboundRoutingKey(task, stepId),
            snapshotRoutingKey: getSnapshotRoutingKey(task, stepId),
            requeueRoutingKey: getRequeueRoutingKey(task, stepId),
            deadLetterRoutingKey: getDeadLetterRoutingKey(task, stepId)
        };
    }

    /**
     * @returns {QueueSteps}
     */
    async createQueuesForTaskNode(task, node, parentNode) {
        const stepId = node.id;

        const {
            exchangeName,
            messagesQueue,
            reboundsQueue,
            reboundRoutingKey,
            dataRoutingKey,
            errorRoutingKey,
            inputRoutingKey,
            requeueRoutingKey,
            snapshotRoutingKey,
            deadLetterRoutingKey
        } = this.getAmqpStepConfig(task, stepId);

        // create queues for messages, errors, rebounds
        await this.assertMessagesQueue(messagesQueue, exchangeName, deadLetterRoutingKey);
        await this.assertReboundsQueue(reboundsQueue, exchangeName, requeueRoutingKey);

        // subscribe queues for their tags
        await this.bindQueue(messagesQueue, exchangeName, inputRoutingKey);
        await this.bindQueue(messagesQueue, exchangeName, requeueRoutingKey);
        await this.bindQueue(reboundsQueue, exchangeName, reboundRoutingKey);

        // subscribe messages queue for results from previous step
        if (parentNode) {
            const parentNodeDataRoutingKey = getDataRoutingKey(task, parentNode.id);
            await this.bindQueue(messagesQueue, exchangeName, parentNodeDataRoutingKey);
        }

        return {
            LISTEN_MESSAGES_ON: messagesQueue,
            PUBLISH_MESSAGES_TO: exchangeName,
            ERROR_ROUTING_KEY: errorRoutingKey,
            SNAPSHOT_ROUTING_KEY: snapshotRoutingKey,
            REBOUND_ROUTING_KEY: reboundRoutingKey,
            DATA_ROUTING_KEY: dataRoutingKey
        };
    }
}

module.exports = QueueCreator;
