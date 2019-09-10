const bunyan = require('bunyan');
const { EventBus, RabbitMqTransport, Event } = require('@openintegrationhub/event-bus');
const config = require('../config/index');
const log = require('./logger');
const { createDispatches } = require('./handlers');

const logger = bunyan.createLogger({ name: 'dispatcher-service' });

let eventBus;


async function publishQueue(ev) {
  try {
    const newEvent = new Event(ev);
    await eventBus.publish(newEvent);
    log.info(`Published event: ${JSON.stringify(ev)}`);
  } catch (err) {
    log.error(err);
  }
}


async function connectQueue() {
  const transport = new RabbitMqTransport({ rabbitmqUri: config.amqpUrl, logger });
  eventBus = new EventBus({ transport, logger, serviceName: 'dispatcher-service' });

  await eventBus.subscribe(config.incomingEventName, async (event) => {
    log.info(`Received event: ${JSON.stringify(event.headers)}`);

    const events = await createDispatches(event.payload);
    const promises = [];

    for (let i = 0; i < events.length; i += 1) {
      promises.push(publishQueue(events[i]));
    }

    await Promise.all(promises);
    await event.ack();
  });

  await eventBus.connect();
}

async function disconnectQueue() {
  log.info('Disconnecting Event Bus');
  await eventBus.disconnect();
}

async function reportHealth() {
  return (eventBus._connected); // eslint-disable-line
}


module.exports = {
  connectQueue, disconnectQueue, reportHealth,
};
