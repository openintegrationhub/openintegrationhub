const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const {
    Event, events, EventBus,
} = require('@openintegrationhub/event-bus');
const conf = require('../src/conf');

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomProperty = function (obj) {
    const keys = Object.keys(obj);
    return obj[keys[keys.length * Math.random() << 0]];
};

(async () => {
    const eventBus = new EventBus({ serviceName: conf.log.namespace, rabbitmqUri: process.env.RABBITMQ_URI });
    await eventBus.connect();

    while (true) {
        const name = events[randomProperty(events)];
        console.log(name);
        await eventBus.publish(new Event({
            headers: {
                name,
            },
            payload: { foo: 'bar1' },
        }));
        await sleep(getRandomInt(200, 2000));
    }

    await eventBus.disconnect();
    process.exit(0);
})();
