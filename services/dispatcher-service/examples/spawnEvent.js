// This script saves a configuration and spawns an event that will create further dispatches in a local environment
// Requires a local mongoDB and rabbitMQ

const { EventBus, RabbitMqTransport, Event } = require('@openintegrationhub/event-bus');
const bunyan = require('bunyan');
const mongoose = require('mongoose');
const Configuration = require('../app/models/configuration');
const config = require('../app/config');

const logger = bunyan.createLogger({ name: 'example' });

async function spawnEvent() {
  console.log('Starting!');

  // Connects to MongoDB and cleans it up
  const options = {
    keepAlive: 1, connectTimeoutMS: 30000, reconnectInterval: 1000, reconnectTries: Number.MAX_VALUE, useNewUrlParser: true,
  };
  await mongoose.connect(config.mongoUrl, options);
  await Configuration.findOneAndDelete({ tenant: 'Test Tenant' });

  // Create an example configuration
  const conf = {
    tenant: 'Test Tenant',
    connections: [
      {
        source: {
          flowId: 'abc',
          appId: 'Snazzy',
        },
        targets: [
          {
            appId: 'Wice',
            flowId: 'def',
          },
          {
            appId: 'Outlook',
            flowId: 'ghi',
          },
        ],
      },
    ],
  };

  const storeConf = new Configuration(conf);
  await storeConf.save();
  console.log('Configuration saved!');

  // Connect to Queue
  // This simulates the same type of connection that the data hub or SDF Adapter would have
  const transport = new RabbitMqTransport({ rabbitmqUri: config.amqpUrl, logger });
  const eventBus = new EventBus({ transport, logger, serviceName: 'example' });
  await eventBus.connect();
  console.log('Event Bus connected!');

  // Create an event similar to one that the Data Hub would spawn
  const ev = {
    headers: {
      name: config.incomingEventNames[0],
    },
    payload: {
      meta: {
        appId: 'Snazzy',
        flowId: 'abc',
      },
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
      },
    },
  };

  // Spawn the event in the same manner the Data Hub would
  const spawnEvent = new Event(ev);
  await eventBus.publish(spawnEvent);
  console.log('Event Spawned');


  // After this point, the dispatcher service ought to receive the event, and spawn two more in response.
  await eventBus.disconnect();
  return ('All done!');
}

spawnEvent()
  .then(
    (text) => { console.log(`${text}`); },
    (err) => { console.log(err); },
  )
  .then(() => { process.exit(); });
