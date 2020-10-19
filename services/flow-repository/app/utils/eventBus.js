const bunyan = require('bunyan');
const { EventBus, RabbitMqTransport, Event } = require('@openintegrationhub/event-bus');
const config = require('../config/index');
const log = require('../config/logger');
const {
  flowStarted, flowStopped, flowFailed, gdprAnonymise,
} = require('./handlers');

const logger = bunyan.createLogger({ name: 'events' });

const storage = require(`../api/controllers/${config.storage}`); // eslint-disable-line

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

  await eventBus.subscribe('flow.failed', async (event) => {
    log.info(`Received event: ${JSON.stringify(event.headers)}`);
    const response = await flowFailed(event.payload.id);

    if (response) {
      await publishQueue({
        headers: {
          name: 'flow.stopping',
        },
        payload: response,
      });
      await event.ack();
    } else {
      await event.nack();
    }
  });

  await eventBus.subscribe(config.gdprEventName, async (event) => {
    log.info('Anonymising user data...');
    const response = await gdprAnonymise(event.payload.id);

    if (response === true) {
      await event.ack();
    } else {
      await event.nack();
    }
  });

  await eventBus.connect();
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
