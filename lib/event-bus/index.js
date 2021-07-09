const EventBusManager = require('./src/EventBusManager');
const packageJson = require('./package.json')

console.log('Event-Bus-Version:', packageJson.version);

module.exports = {
    EventBusManager: new EventBusManager({}),
    EventBus: require('./src/EventBus'),
    Event: require('./src/Event'),
    Transport: require('./src/Transport'),
    RabbitMqTransport: require('./src/RabbitMqTransport'),
    events: require('./src/events'),
};
