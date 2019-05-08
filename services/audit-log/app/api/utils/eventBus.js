const bunyan = require('bunyan');
const mongoose = require('mongoose');
const { EventBus, RabbitMqTransport } = require('@openintegrationhub/event-bus');
const config = require('../../config/index');
const log = require('../../config/logger');
const { validate } = require('./validator');

const logger = bunyan.createLogger({ name: 'auditlogs' });

let eventBus;

async function connectQueue() {
  const transport = new RabbitMqTransport({ rabbitmqUri: config.amqpUrl, logger });
  eventBus = new EventBus({ transport, logger, serviceName: 'audit-log' });

  await eventBus.subscribe('audit.*', async (event) => {
    log.info(`Received event: ${JSON.stringify(event.headers)}`);

    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      log.error('Received event while DB was unready. Retrying...');
      await event.nack();
    } else {
      await validate(event.payload);
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
