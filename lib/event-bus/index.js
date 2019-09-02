const EventBusManager = require('./src/EventBusManager');

module.exports = {
    EventBusManager: new EventBusManager({}),
    EventBus: require('./src/EventBus'),
    Event: require('./src/Event'),
    Transport: require('./src/Transport'),
    RabbitMqTransport: require('./src/RabbitMqTransport'),
    events: require('./src/events'),
};
