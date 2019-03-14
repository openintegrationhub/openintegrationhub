const bunyan = require('bunyan');
const config = require('../config/index');
const log = require('../config/logger');
const { EventBus, RabbitMqTransport, Event } = require('@openintegrationhub/event-bus');
const { flowStarted, flowStopped } = require('./handlers');

const logger = bunyan.createLogger({ name: 'events' });

const storage = require(`../api/controllers/${config.storage}`); // eslint-disable-line

let eventBus;


async function connectQueue() {
  const transport = new RabbitMqTransport({ rabbitmqUri: config.amqpUrl });
  eventBus = new EventBus({ transport, logger, serviceName: 'flow-repository' });

  await eventBus.subscribe('flow.started', async (event) => {
    log.info(`Received event: ${JSON.stringify(event.headers)}`);
    const response = await flowStarted(event.payload.id);

    if (response === true) {
      await event.ack();
    } else {
      await event.nack();
    }
  });

  await eventBus.subscribe('flow.stopped', async (event) => {
    log.info(`Received event: ${JSON.stringify(event.headers)}`);
    const response = await flowStopped(event.payload.id);

    if (response === true) {
      await event.ack();
    } else {
      await event.nack();
    }
  });

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
  return (eventBus._connected); // eslint-disable-line
}


module.exports = {
  connectQueue, publishQueue, disconnectQueue, reportHealth,
};
