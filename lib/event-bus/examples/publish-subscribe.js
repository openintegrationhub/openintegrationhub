const { EventBus, RabbitMqTransport, Event } = require('..');

(async () => {
    const transport = new RabbitMqTransport({rabbitmqUri: 'amqp://localhost/'});
    const eventBus = new EventBus({transport, serviceName: 'my-service'});
    await eventBus.connect();

    await eventBus.subscribe({topic: '*.*'}, async (event) => {
        console.log(event.headers, event.payload);
        await event.ack();
    });

    const event = new Event({
        headers: {
            name: 'flow.started',
            serviceName: 'my-service'
        },
        payload: {test: 1}
    });

    await eventBus.publish(event);
})().catch(console.error);

