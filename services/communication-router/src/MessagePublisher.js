const { MessagePublishers } = require('@openintegrationhub/webhooks');
const { errors } = require('backend-commons-lib');
const { ResourceNotFoundError } = errors;

class OIH_MessagePublisher extends MessagePublishers.Base {
    constructor({queueCreator, channel}) {
        super();
        this._queueCreator = queueCreator;
        this._channel = channel;
    }

    async publish(flow, msg, msgOpts) {
        const node = flow.getFirstNode();
        if (!node) {
            throw new ResourceNotFoundError('Flow has no first node'); //@todo: figure out with status
        }

        const queue = this._queueCreator.getAmqpStepConfig(flow, node.id).messagesQueue;
        await this._channel.sendToQueue(
            queue,
            Buffer.from(JSON.stringify(msg)),
            msgOpts
        );
    }
}

module.exports = OIH_MessagePublisher;
