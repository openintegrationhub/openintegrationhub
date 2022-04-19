const bunyan = require('bunyan');
const { EventBus, RabbitMqTransport, Event } = require('@openintegrationhub/event-bus');
const config = require('../config/index');
const log = require('../config/logger');

const { addProvenanceEvent } = require('../api/controllers/mongo');

const logger = bunyan.createLogger({ name: 'events' });

const storage = require(`../api/controllers/${config.storage}`); // eslint-disable-line

let eventBus;

function onCloseCallback(error) {
  // console.log('onCloseCallback called by EventBus!');
  if (error) {
    log.error(error);
  }
}

async function connectQueue() {
  const transport = new RabbitMqTransport({ rabbitmqUri: config.amqpUrl, logger, onCloseCallback });
  eventBus = new EventBus({
    transport, logger, serviceName: 'analytics-service',
  });

  await eventBus.subscribe('provenance', async (event) => {
    log.info(`Received event: ${JSON.stringify(event.headers)}`);

    const response = await addProvenanceEvent(event.payload);

    if (response !== false && 'id' in response) {
      log.info('Message saved and acked');
      await event.ack();
    } else {
      log.error('AddProvenanceEvent Response-Error:', response);
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
