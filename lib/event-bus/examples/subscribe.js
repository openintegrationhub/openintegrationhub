const { EventBus, RabbitMqTransport } = require('..');

const bunyan = require('bunyan'); // import your logger (needs to support an: .trace(), debug() and .error() method at the moment)

(async () => {
    // passing the logger
    const logger = bunyan.createLogger({name: 'test'});

    // configuring the transport method
    const transport = new RabbitMqTransport({rabbitmqUri: 'amqp://localhost/', logger});

    // configuring the EventBus
    const eventBus = new EventBus({transport, logger, serviceName: 'my-service'});

    // Subscribe to receive an event
    await eventBus.subscribe('flow.*', async (event) => {
        console.log('Message received');
        console.log(event.headers, event.payload);
        // confirm that message will be processed
        await event.ack();

        // give message back if service is not ready to handle it
        // await event.nack();
    });

    // you need to declare all subscriptions first and then connect

    // connection will be restarted after 1s if if it gets lost
    await eventBus.connect();

})().catch(console.error);
