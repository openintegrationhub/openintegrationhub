const config = require('../config/index');
const log = require('../config/logger');
const { EventBus, RabbitMqTransport, Event } = require('../../../../lib/event-bus');

async function publish(ev) {
  const transport = new RabbitMqTransport({ rabbitmqUri: config.amqpUrl });
  const eventBus = new EventBus({ transport, log, serviceName: 'flow-repository' });
  try {
    await eventBus.connect();
    const newEvent = new Event(ev);
    await eventBus.publish(newEvent);
    log.info(`Published event: ${JSON.stringify(ev)}`);

    // Interim solution to keep tests from hanging up
    if (process.env.NODE_ENV === 'test') {
      await eventBus.disconnect();
    }
  } catch (err) {
    log.error(err);
  }
}

module.exports = { publish };
