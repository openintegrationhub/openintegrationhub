const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const {
    Event, EventBusManager, events, EventBus,
} = require('@openintegrationhub/event-bus');


(async () => {
    const eventBus = new EventBus({ serviceName: 'test', rabbitmqUri: process.env.RABBITMQ_URI });
    await eventBus.connect();

    // EventBusManager.init({ eventBus, serviceName: 'test' });

    const event = new Event({
        headers: {
            name: events['secrets.secret.created'],
        },
        payload: { foo: 'bar' },
    });

    eventBus.publish(event);
})();


// this.eventBus.subscribe(events['iam.tenant.deleted'], async (event) => {
//     // try {
//     //     await event.ack();
//     // } catch (err) {
//     //     logger.error('failed to delete domains on iam.tenant.deleted for event', event);
//     //     logger.error(err);
//     // }
// });
