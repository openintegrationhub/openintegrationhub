const _ = require('lodash');
const { URL } = require('url');

const toBase64 = str => Buffer.from(str).toString('base64');
const fromBase64 = str => Buffer.from(str, 'base64').toString();

class FlowSecret {
    constructor({ metadata = {}, data = {} } = {}) {
        Object.assign(this, {
            metadata,
            data
        });
    }

    get id() {
        return _.get(this, 'metadata.name');
    }

    get amqpUsername() {
        const { username } = new URL(_.get(this, 'data.AMQP_URI'));
        return username;
    }

    toDescriptor() {
        return {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: this.metadata,
            data: Object.entries(this.data).reduce((hash, entry) => {
                const [ key, value ] = entry;
                hash[key] = toBase64(value);
                return hash;
            }, {})
        };
    }

    static fromDescriptor(descriptor = {}) {
        return new this({
            metadata: descriptor.metadata,
            data: Object.entries(descriptor.data || {}).reduce((hash, entry) => {
                const [ key, value ] = entry;
                hash[key] = fromBase64(value);
                return hash;
            }, {})
        });
    }
}

module.exports = FlowSecret;
