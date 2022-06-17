/* eslint guard-for-in: "off" */

const bunyan = require('bunyan');
const { EventBus, RabbitMqTransport, Event } = require('@openintegrationhub/event-bus');
const config = require('../config/index');
const log = require('../config/logger');

const { addFlowErrorMessage } = require(`../api/controllers/${config.storage}`);  // eslint-disable-line

const logger = bunyan.createLogger({ name: 'events' });

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

  await eventBus.subscribe('flow.error', async (event) => {
    log.info(`Received error mesage: ${JSON.stringify(event.headers)}`);

    let noError = true;
    const errorResponses = [];
    for (const timeFrame in config.timeWindows) {
      const response = await addFlowErrorMessage(timeFrame, event.payload);
      if (response !== false && 'id' in response) {
        noError = false;
        errorResponses.push(response);
      }
    }

    // if (response !== false && 'id' in response) {
    if (noError) {
      log.info('Message saved and acked');
      await event.ack();
    } else {
      log.error('Add Error Message Response-Error:', errorResponses);
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
