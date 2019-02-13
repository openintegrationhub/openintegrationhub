const assert = require('assert');
const Transport = require('./Transport');
const Event = require('./Event');

class EventBus {
    constructor({transport, serviceName, logger}) {
        assert(transport instanceof Transport, 'transport parameter have to be of type Transport');
        assert(serviceName, 'serviceName parameter is required');
        this._logger = logger;
        this._transport = transport;
        this._serviceName = serviceName;
        this._handlers = {};
    }

    async connect() {
        const topics = this._getEventNames();
        await this._transport.connect();
        if (topics.length > 0) {
            await this._transport.subscribe({topics, serviceName: this._serviceName}, this._handleEvent.bind(this));
        }
    }

    async _handleEvent(event) {
        this._logger.trace({event}, 'Received event');
        const eventName = event.name;
        const eventHandlers = this._handlers[eventName] || [];

        if (eventHandlers.length === 0) {
            return this._logger.trace({event}, 'No event handler found');
        }

        for (let handler of eventHandlers) {
            try {
                await handler(event);
            } catch (err) {
                this._logger.error(err);
            }
        }
    }

    _getEventNames() {
        return Object.keys(this._handlers).reduce((list, eventName) => {
            if (this._handlers[eventName].length > 0) {
                list.push(eventName);
            }
            return list;
        }, []);
    }

    disconnect() {
        return this._transport.disconnect();
    }

    publish(event) {
        assert(event instanceof Event, 'event param have to be of type Event');
        event.setServiceName(this._serviceName);
        return this._transport.publish(event);
    }

    subscribe(eventName, callback) {
        this._handlers[eventName] = this._handlers[eventName] || [];
        this._handlers[eventName].push(callback);
    }
}

module.exports = EventBus;
