const assert = require('assert');
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
        return this.EventBus;
    }

    setEventBus(EventBus) {
        this.EventBus = EventBus;
    }

    getEventBus() {
        assert(this.EventBus, 'No Event bus set. Use EventBusManager.init to set an event bus first');
        return this.EventBus;
    }

    async destroy() {
        if (this.EventBus) {
            try {
                return this.EventBus.disconnect();
            } catch (e) {
                console.error('Failed to disconnect the EventBus', e);
            }
        }
    }
}

module.exports = EventBusManager;