const _ = require('lodash');

const toBase64 = (str) => Buffer.from(str).toString('base64');
const fromBase64 = (str) => Buffer.from(str, 'base64').toString();

/**
 * Represents a K8s Secret
 */
class Secret {
    constructor({ metadata = {}, data = {} } = {}) {
        Object.assign(this, {
            metadata,
            data,
        });
    }

    get id() {
        return this.name;
    }

    get name() {
        return _.get(this, 'metadata.name');
    }

    setMetadataValue(key, value) {
        this.metadata[key] = value;
    }

    getMetadataValue(key) {
        return _.get(this, `metadata.${key}`);
    }

    /**
     * Return K8s descriptor representation.
     * @returns K8s descriptor
     */
    toDescriptor() {
        return {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: this.metadata,
            data: Object.entries(this.data).reduce((hash, entry) => {
                const [key, value] = entry;
                if (value !== undefined) hash[key] = toBase64(value);
                return hash;
            }, {}),
        };
    }

    /**
     * Create a Secret from a K8s descriptor.
     * @param {Object} descriptor
     * @returns {Secret}
     */
    static fromDescriptor(descriptor = {}) {
        return new this({
            metadata: descriptor.metadata,
            data: Object.entries(descriptor.data || {}).reduce((hash, entry) => {
                const [key, value] = entry;
                if (value !== undefined) hash[key] = fromBase64(value);
                return hash;
            }, {}),
        });
    }
}

module.exports = Secret;
