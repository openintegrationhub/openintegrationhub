const Transport = require('./Transport');
const assert = require('assert');

class ConsoleTransport extends Transport {

    constructor({ logger }) {
        super();
        assert(logger, 'logger parameter is required');
        this._logger = logger;
        this._subscriptions = [];
    }

    reset() {

    }

    async connect() {
        return this;
    }

    async disconnect() {
        return this;
    }

    async publish(event) {
        this._subscriptions.forEach(elem => {
            if (elem.topics.indexOf(event.headers.name) >= 0) {
                elem.callback(event);
            }
        })
    }

    async subscribe({topics, serviceName}, callback) {
        this._subscriptions.push({topics, serviceName, callback});
    }
}

module.exports = ConsoleTransport;
