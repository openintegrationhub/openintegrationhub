const bunyan = require('bunyan');
const { EventBus, RabbitMqTransport, Event } = require('@openintegrationhub/event-bus');
const config = require('../config/index');
const log = require('../config/logger');
const { flowStarted, flowStopped } = require('./handlers');

const logger = bunyan.createLogger({ name: 'events' });

const storage = require(`../api/controllers/${config.storage}`); // eslint-disable-line

let eventBus;


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

async function publishAuditLog(ev) {
  try {
    const now = new Date();
    const timestamp = now.toISOString();

    const fullEvent = {
      headers: {
        name: `audit.${ev.name}`,
      },
      payload: {
        service: 'flow-repository',
        timeStamp: timestamp,
        nameSpace: 'oih-dev-ns',
        payload: ev.payload,
      },
    };

    const newEvent = new Event(fullEvent);
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
  connectQueue, publishQueue, disconnectQueue, reportHealth, publishAuditLog,
};
