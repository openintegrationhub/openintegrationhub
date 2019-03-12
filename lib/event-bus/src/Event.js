const _ = require('lodash');

class Event {
    constructor({headers = {}, payload = {}, }) {
        this._headers = headers;
        this._payload = payload;
        this._headers.createdAt = Date.now();
    }

    get name() {
        return this.getHeader('name');
    }

    get serviceName() {
        return this.getHeader('serviceName');
    }

    get createdAt() {
        return this.getHeader('createdAt');
    }

    get headers() {
        return this._headers;
    }

    get payload() {
        return this._payload;
    }

    setServiceName(serviceName) {
        this.setHeader('serviceName', serviceName);
    }

    toJSON() {
        return {
            headers: this.headers,
            payload: this.payload
        };
    }

    setHeader(name, value) {
        this._headers[name] = value;
    }

    getHeader(name) {
        return _.get(this._headers, name);
    }

    ack() {

    }

    nack() {

    }
}

module.exports = Event;
