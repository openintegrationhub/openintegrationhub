const config = require('../config/index');
const log = require('../config/logger');
const { EventBus, RabbitMqTransport, Event } = require('../../../../lib/event-bus');
const bunyan = require('bunyan');

const logger = bunyan.createLogger({ name: 'test' });

const storage = require(`../api/controllers/${config.storage}`); // eslint-disable-line

let eventBus;


async function flowStarted(id) {
  const response = await storage.startedFlow(id);
  if (response) {
    return true;
  }
  return false;
}

async function flowStopped(id) {
  const response = await storage.stoppedFlow(id);
  if (response) {
    return true;
  }
  return false;
}

async function connectQueue() {
  const transport = new RabbitMqTransport({ rabbitmqUri: config.amqpUrl });
  eventBus = new EventBus({ transport, logger, serviceName: 'flow-repository' });

  await eventBus.subscribe('flow.started', async (event) => {
    log.info(`Received event: ${JSON.stringify(event.headers)}`);
    const response = flowStarted(event.payload.id);

    if (response === true) {
      await event.ack();
    } else {
      await event.nack();
    }
  });

  await eventBus.subscribe('flow.stopped', async (event) => {
    log.info(`Received event: ${JSON.stringify(event.headers)}`);
    const response = flowStopped(event.payload.id);

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
  return (eventBus);
}


module.exports = {
  connectQueue, publishQueue, disconnectQueue, reportHealth,
};
