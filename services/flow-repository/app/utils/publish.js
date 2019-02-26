const config = require('../config/index');
const log = require('../config/logger');
const { EventBus, RabbitMqTransport, Event } = require('../../../../lib/event-bus');

let eventBus;

async function connectQueue() {
  const transport = new RabbitMqTransport({ rabbitmqUri: config.amqpUrl });
  eventBus = new EventBus({ transport, log, serviceName: 'flow-repository' });
  await eventBus.connect();
}

async function publishQueue(ev) {
  try {
    const newEvent = new Event(ev);
    await eventBus.publish(newEvent);
    log.info(`Published event: ${JSON.stringify(ev)}`);
  } catch (err) {
    log.error(err);
  }
}

async function disconnectQueue() {
  await eventBus.disconnect();
}

async function reportHealth() {
  return (eventBus);
}


module.exports = {
  connectQueue, publishQueue, disconnectQueue, reportHealth,
};
