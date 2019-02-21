const { EventBus, RabbitMqTransport, Event } = require('..');
const bunyan = require('bunyan');

(async () => {
    const logger = bunyan.createLogger({name: 'test'});
    const transport = new RabbitMqTransport({rabbitmqUri: 'amqp://localhost/'});
    const eventBus = new EventBus({transport, logger, serviceName: 'my-service'});

    await eventBus.subscribe('flow.started', async (event) => {
        console.log(event.headers, event.payload);
        await event.ack();
    });

    // you need to declare all subscriptions first and then connect
    await eventBus.connect();

    const event = new Event({
        headers: {
            name: 'flow.started',
            serviceName: 'my-service'
        },
        payload: {test: 1}
    });

    await eventBus.publish(event);
})().catch(console.error);

