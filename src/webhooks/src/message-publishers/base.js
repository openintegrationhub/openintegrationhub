/**
 * Abstraction layer for sending received messages for an execution.
 */
class MessagePublisher {
    /**
     * Publish message for execution.
     * @param {Flow} flow
     * @param {Message} msg
     * @param {Object} msgOpts
     */
    publish(flow, msg, msgOpts) { //eslint-disable-line
        throw new Error('To be implemented');
    }
}

module.exports = MessagePublisher;
