const bunyan = require('bunyan');
const { EventBus, RabbitMqTransport } = require('@openintegrationhub/event-bus');
const config = require('../config/index');
const log = require('./logger');

const logger = bunyan.createLogger({ name: 'auditlogs' });

let eventBus;

async function connectQueue() {
  const transport = new RabbitMqTransport({ rabbitmqUri: config.amqpUrl, logger });
  eventBus = new EventBus({ transport, logger, serviceName: 'dispatcher-service' });

  // TODO: Subscribe event handlers here

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
