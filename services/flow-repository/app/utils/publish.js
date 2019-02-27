const bunyan = require('bunyan');
const mongoose = require('mongoose');
const config = require('../config/index');
const log = require('../config/logger');
const { EventBus, RabbitMqTransport, Event } = require('../../../../lib/event-bus');

const logger = bunyan.createLogger({ name: 'events' });

const storage = require(`../api/controllers/${config.storage}`); // eslint-disable-line

let eventBus;


async function flowStarted(id) {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return false;
  }

  const response = await storage.startedFlow(id);
  if (!response) {
    log.error(`Flow with id ${id} could not be found.`);
  }
  return true;
}

async function flowStopped(id) {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return false;
  }

  const response = await storage.stoppedFlow(id);
  if (!response) {
    log.error(`Flow with id ${id} could not be found.`);
  }
  return true;
}

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
  return (eventBus);
}


module.exports = {
  connectQueue, publishQueue, disconnectQueue, reportHealth,
};
