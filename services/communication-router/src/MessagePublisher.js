const { MessagePublishers } = require('@openintegrationhub/webhooks');
const { errors } = require('backendCommonsLib');
const { ResourceNotFoundError } = errors;

class OIH_MessagePublisher extends MessagePublishers.Base {
    constructor(queueCreator, amqpChannel) {
        super();
        this._queueCreator = queueCreator;
        this._channel = amqpChannel;
    }

    async publish(flow, msg, msgOpts) {
        const step = flow.getFirstNode();
        if (!step) {
            throw new ResourceNotFoundError('Flow has no input step node'); //@todo: figure out with status
        }

        const queue = this._queueCreator.getAmqpStepConfig(flow, step.id).messagesQueue;
        console.log(queue);
        await this._channel.sendToQueue(
            queue,
            Buffer.from(JSON.stringify(msg)),
            msgOpts
        );
    }
}

module.exports = OIH_MessagePublisher;
