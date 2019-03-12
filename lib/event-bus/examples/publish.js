const { EventBus, RabbitMqTransport } = require('..');
const { Event } = require('..'); // only required for creating a new event

const bunyan = require('bunyan'); // import your logger (needs to support an: .trace(), debug() and .error() method at the moment)

(async () => {
    // passing the logger
    const logger = bunyan.createLogger({name: 'test'});

    // configuring the transport method
    const transport = new RabbitMqTransport({rabbitmqUri: 'amqp://guest:guest@localhost:5672', logger});

    // configuring the EventBus
    const eventBus = new EventBus({transport, logger, serviceName: 'my-service'});

    // make connection (required for publish and for subscribe)
    // connection will be restarted after 1s if if it gets lost
    await eventBus.connect();

    // creating a new event
    const event = new Event({
        headers: {
            name: 'flow.started'
        },
        payload: {test: 1}
    });

    // publish the created event
    const result = await eventBus.publish(event);

    if(result === false) {
      logger.error('Publishing failed you need to implement your own logic to retry publishing if it fails on publishing');
    }

    // eventBus.disconnect();
})().catch(console.error);
