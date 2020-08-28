const assert = require('assert');
const bunyan = require('bunyan');

const Transport = require('./Transport');
const Event = require('./Event');
const RabbitMqTransport = require('./RabbitMqTransport');
const ConsoleTransport = require('./ConsoleTransport');

class EventBus {
    constructor({ transport, serviceName, logger, rabbitmqUri }) {

        assert(serviceName, 'serviceName parameter is required');

        if (!logger) {
            logger = bunyan.createLogger({ name: serviceName });
        }
        assert(logger, 'logger parameter is required');

        if (!transport) {
            if (rabbitmqUri) {
                logger.trace('Using RabbitMqTransport');
                transport = new RabbitMqTransport({ rabbitmqUri, logger });
            } else {
                logger.trace('Using ConsoleTransport');
                transport = new ConsoleTransport({ logger });
            }
        }
        assert(transport instanceof Transport, 'transport parameter have to be of type Transport');
        this._logger = logger;
        this._transport = transport;
        this._serviceName = serviceName;
        this._handlers = {};
        this._connected = false;
    }

    async connect() {
        const topics = this._getEventNames();
        await this._transport.connect();
        if (topics.length > 0) {
            await this._transport.subscribe({ topics, serviceName: this._serviceName }, this._handleEvent.bind(this));
        }
        this._connected = true;
    }

    async _handleEvent(event) {
        Object.freeze(event);
        this._logger.trace({ event }, 'Received event');

        const eventName = event.name;
        const eventHandlers = [...this._handlers[eventName] || []];

        // allow global wildcards
        if ('#' in this._handlers) {
            eventHandlers.push(...this._handlers['#']);
        }
        if ('*' in this._handlers) {
            eventHandlers.push(...this._handlers['*']);
        }

        // allow second level wildcards
        const fragments = eventName.split('.');
        if (fragments.length > 1) {
            const star = `${fragments[0]}.*`;
            if (star in this._handlers) {
                eventHandlers.push(...this._handlers[star]);
            }
            const hashsign = `${fragments[0]}.#`;
            if (hashsign in this._handlers) {
                eventHandlers.push(...this._handlers[hashsign]);
            }
        }

        if (eventHandlers.length === 0) {
            await event.ack();
            return this._logger.trace({ event }, 'No event handler found');
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
        if (this._connected) {
            throw new Error('It`s not possible to subscribe after the connection');
        }
        this._handlers[eventName] = this._handlers[eventName] || [];
        this._handlers[eventName].push(callback);
    }
}

module.exports = EventBus;
