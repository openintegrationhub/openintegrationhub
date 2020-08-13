const { MessagePublishers } = require('@openintegrationhub/webhooks');
const { Event } = require('@openintegrationhub/event-bus');
const { errors } = require('backend-commons-lib');
const { ResourceNotFoundError } = errors;

class OIH_MessagePublisher extends MessagePublishers.Base {
  constructor({ eventBus }) {
    super();
    this._eventBus = eventBus;
  }

  async publish(flow, msg, msgOpts) {
    const node = flow.getFirstNode();
    if (!node) {
      throw new ResourceNotFoundError('Flow has no first node'); //@todo: figure out with status
    }

    const event = new Event({
      headers: {
        name: 'flow.execute',
        type: 'webhooks',
      },
      payload: {
        flow,
        msg,
        msgOpts,
      },
    });
    this._eventBus.publish(event);

    // const queue = this._queueCreator.getAmqpStepConfig(flow, node.id).messagesQueue;
    // await this._channel.sendToQueue(
    //     queue,
    //     Buffer.from(JSON.stringify(msg)),
    //     msgOpts
    // );
  }
}

module.exports = OIH_MessagePublisher;
