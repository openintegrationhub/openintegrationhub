// This script saves a configuration and spawns an event that will create further dispatches in a local environment
// To use it, first start a local instance of the dispatcher service, using "npm start"
// Then run this script using "node ./spawnEvent"
// The instance of the dispatcher then ought to receive the event and process it
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
    connectTimeoutMS: 30000,
  };
  await mongoose.connect(config.mongoUrl, options);
  await Configuration.findOneAndDelete({ tenant: 'Test Tenant' });

  // Create an example configuration
  // This one links three apps, each with outbound and inbound flows
  const conf = {
    tenant: 'Test Tenant',
    applications: [
      {
        applicationName: 'Snazzy Contacts',
        applicationUid: 'snazzy1234',
        adapterComponentId: 'Irrelevant for this example',
        transformerComponentId: 'Irrelevant for this example',
        secretId: 'Irrelevant for this example',

        outbound: {
          active: true,
          flows: [
            {
              transformerAction: 'Irrelevant for this example',
              adapterAction: 'Irrelevant for this example',
              schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
              flowId: 'SnazzyOutbound',
            },
          ],
        },
        inbound: {
          active: true,
          flows: [
            {
              transformerAction: 'Irrelevant for this example',
              adapterAction: 'Irrelevant for this example',
              schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
              operation: 'CREATE',
              flowId: 'SnazzyInboundCreate',
            },
          ],
        },
      },
      {
        applicationName: 'Wice CRM',
        applicationUid: 'wice5678',
        adapterComponentId: 'Irrelevant for this example',
        transformerComponentId: 'Irrelevant for this example',
        secretId: 'Irrelevant for this example',

        outbound: {
          active: true,
          flows: [
            {
              transformerAction: 'Irrelevant for this example',
              adapterAction: 'Irrelevant for this example',
              schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
              flowId: 'WiceOutbound',
            },
          ],
        },
        inbound: {
          active: true,
          flows: [
            {
              transformerAction: 'Irrelevant for this example',
              adapterAction: 'Irrelevant for this example',
              schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
              operation: 'CREATE',
              flowId: 'WiceInboundCreate',
            },
          ],
        },
      },
      {
        applicationName: 'Google Contacts',
        applicationUid: 'google1357',
        adapterComponentId: 'Irrelevant for this example',
        transformerComponentId: 'Irrelevant for this example',
        secretId: 'Irrelevant for this example',

        outbound: {
          active: true,
          flows: [
            {
              transformerAction: 'Irrelevant for this example',
              adapterAction: 'Irrelevant for this example',
              schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
              flowId: 'GoogleOutbound',
            },
          ],
        },
        inbound: {
          active: true,
          flows: [
            {
              transformerAction: 'Irrelevant for this example',
              adapterAction: 'Irrelevant for this example',
              schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
              operation: 'CREATE',
              flowId: 'GoogleInboundCreate',
            },
          ],
        },
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
      name: config.createEventName,
    },
    payload: {
      meta: {
        applicationUid: 'snazzy1234',
        flowId: 'SnazzyOutbound',
        refs: [
          {
            applicationUid: 'snazzy1234',
            recordUid: 'abcd',
          },
          {
            applicationUid: 'wice5678',
            recordUid: 'efgh',
          },
          {
            applicationUid: 'google1357',
            recordUid: 'ijkl',
          },
        ],
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
