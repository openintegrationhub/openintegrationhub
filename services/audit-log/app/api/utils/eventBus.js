const bunyan = require('bunyan');
const mongoose = require('mongoose');
const { EventBus, RabbitMqTransport } = require('@openintegrationhub/event-bus');
const config = require('../../config/index');
const log = require('../../config/logger');
const { validate, gdprAnonymise } = require('./validator');

const logger = bunyan.createLogger({ name: 'auditlogs' });

let eventBus;

async function connectQueue() {
  const { eventNames, gdprEventName } = config;
  const transport = new RabbitMqTransport({ rabbitmqUri: config.amqpUrl, logger });
  eventBus = new EventBus({ transport, logger, serviceName: 'audit-log' });

  const promises = [];

  for (let i = 0; i < eventNames.length; i += 1) {
    promises.push(eventBus.subscribe(eventNames[i], async (event) => {
      log.info(`Received event: ${JSON.stringify(event.headers)}`);

      if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        log.error('Received event while DB was unready. Retrying...');
        await event.nack();
      } else {
        await validate(event.payload);
        await event.ack();
      }
    }));
  }

  await Promise.all(promises);

  await eventBus.subscribe(gdprEventName, async (event) => {
    log.info('Anonymising user data...');

    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      log.error('Received event while DB was unready. Retrying...');
      await event.nack();
    } else {
      await gdprAnonymise(event.payload);
      await event.ack();
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
  connectQueue, disconnectQueue, reportHealth,
};
