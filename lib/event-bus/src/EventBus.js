const assert = require('assert');
const Transport = require('./Transport');
const Event = require('./Event');

class EventBus {
    constructor({transport, serviceName}) {
        assert(transport instanceof Transport, 'transport parameter have to be of type Transport');
        assert(serviceName, 'serviceName parameter is required');
        this._transport = transport;
        this._serviceName = serviceName;
    }

    connect() {
        return this._transport.connect();
    }

    disconnect() {
        return this._transport.disconnect();
    }

    publish(event) {
        assert(event instanceof Event, 'event param have to be of type Event');
        event.setServiceName(this._serviceName);
        return this._transport.publish(event);
    }

    subscribe({topic}, callback) {
        return this._transport.subscribe({topic, serviceName: this._serviceName}, callback);
    }
}

module.exports = EventBus;
