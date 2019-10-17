/* eslint no-await-in-loop: "off" */

const bunyan = require('bunyan');
const { EventBus, RabbitMqTransport, Event } = require('@openintegrationhub/event-bus');
const config = require('../config/index');
const log = require('./logger');
const { createDispatches, getTargets, checkFlows } = require('./handlers');

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

  await eventBus.subscribe(config.createEventName, async (event) => {
    log.info(`Received event: ${JSON.stringify(event.headers)}`);

    if (!event.payload.meta || !event.payload.meta.flowId) {
      log.warn('Received malformed event:');
      log.warn(event.payload);
      return event.ack();
    }

    const targets = await getTargets(event.payload.meta.flowId);

    if (!targets) {
      log.info('No targets found for event.');
      return event.ack();
    }

    await checkFlows(targets);

    const events = await createDispatches(targets, event.payload);
    const promises = [];

    for (let j = 0; j < events.length; j += 1) {
      promises.push(publishQueue(events[j]));
    }

    await Promise.all(promises);
    return event.ack();
  });

  await eventBus.subscribe(config.updateEventName, async (event) => {
    log.info(`Received event: ${JSON.stringify(event.headers)}`);

    const { payload } = event;

    if (!payload.meta || !payload.meta.flowId) {
      log.warn('Received malformed event:');
      log.warn(event.payload);
      return event.ack();
    }

    const targets = await getTargets(payload.meta.flowId);

    if (!targets) {
      log.info('No targets found for event.');
      return event.ack();
    }

    await checkFlows(targets);

    const events = await createDispatches(targets, payload);
    const promises = [];

    for (let j = 0; j < events.length; j += 1) {
      promises.push(publishQueue(events[j]));
    }

    await Promise.all(promises);
    return event.ack();
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

async function disconnectDummies(dummyQueues) {
  try {
    const promises = [];
    for (let i = 0; i < dummyQueues.length; i += 1) {
      promises.push(dummyQueues[i].disconnect());
    }
    await Promise.all(promises);
  } catch (e) {
    log.error(`Error while disconnecting dummy queues: ${e}`);
  }
}

// This function will create a dummy queue to make certain no messages are lost
// This queue will later be emptied by an instance of the sdf adapter
async function createDummyQueues(keys) {
  if (process.env.NODE_ENV !== 'test') {
    const dummyQueues = [];
    for (let i = 0; i < keys.length; i += 1) {
      try {
        const dummyLogger = bunyan.createLogger({ name: 'sdf-adapter' });
        const transport = new RabbitMqTransport({
          rabbitmqUri: config.amqpUrl,
          logger: dummyLogger,
        });
        const dummyEventBus = new EventBus({
          transport,
          logger: dummyLogger,
          serviceName: 'sdf-adapter',
        });

        await dummyEventBus.subscribe(keys[i], async () => {});
        await dummyEventBus.connect();
        dummyQueues.push(dummyEventBus);
      } catch (e) {
        log.error(`Error while creating dummy queue: ${e}`);
      }
    }
    setTimeout(async () => { await disconnectDummies(dummyQueues); }, 50);
  }
}


module.exports = {
  connectQueue, disconnectQueue, reportHealth, createDummyQueues, disconnectDummies,
};
