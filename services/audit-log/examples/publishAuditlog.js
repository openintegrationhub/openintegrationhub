const { Event, EventBus, RabbitMqTransport } = require('../../../lib/event-bus');

const bunyan = require('bunyan'); // import your logger (needs to support an: .trace(), debug() and .error() method at the moment)

// This is largely a copy of the event bus examples
// This simulates the publishing of an audit log event

(async () => {
  // passing the logger
  const logger = bunyan.createLogger({ name: 'test' });

  // configuring the transport method
  const transport = new RabbitMqTransport({ rabbitmqUri: 'amqp://guest:guest@localhost:5672', logger });

  // configuring the EventBus, service name is arbitrary
  const eventBus = new EventBus({ transport, logger, serviceName: 'flow-repository' });

  // make connection (required for publish and for subscribe)
  // connection will be restarted after 1s if it gets lost
  await eventBus.connect();

  // creating a new event
  // Name must start with 'audit'
  // Payload must adhere to the message format expected by the audit log
  const event = new Event({
    headers: {
      name: 'audit.flowCreated',
    },
    payload: {
      service: 'flow-repository',
      timeStamp: '12345',
      nameSpace: 'outerSpace',
      payload: {
        tenant: 'testTenant',
        source: 'testUser',
        object: 'flow',
        action: 'create flow',
        subject: 'Flow xyz',
        details: 'User testUser of tenant testTenant created a flow with id xyz',
      },
    },
  });

  // logging for easier testing
  console.log(`Published event with name: ${event.name}`);

  // publish the created event
  const result = await eventBus.publish(event);


  // eventBus.disconnect();
})().catch(console.error);
