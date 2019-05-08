const EventBus = require('./EventBus');

class EventBusManager {

    constructor() {
    }

    init({ eventBus, rabbitmqUri, serviceName }) {
        if (eventBus) {
            this.EventBus = eventBus;
        } else {
            this.EventBus = new EventBus({ serviceName, rabbitmqUri });
        }
    }

    setEventBus(EventBus) {
        this.EventBus = EventBus;
    }

    getEventBus() {
        assert(this.EventBus, 'No Event bus set. Use EventBusManager.init to set an event bus first');
        return this.EventBus;
    }
}

module.exports = EventBusManager;