const _ = require('lodash');
const CredentialsStorage = require('./CredentialsStorage');

class InMemoryCredentialsStorage extends CredentialsStorage {
    constructor() {
        super();
        this._store = {};
    }

    async get(flowId, nodeId) {
        return _.get(this._store, [flowId, nodeId]);
    }

    async set(flowId, nodeId, credential) {
        this._store[flowId] = this._store[flowId] || {};
        this._store[flowId][nodeId] = credential;
    }

    async remove(flowId, nodeId) {
        if (_.get(this._store, [flowId, nodeId])) {
            delete this._store[flowId][nodeId];
        }
    }

    async getAllForFlow(flowId) {
        const credentials = this._store[flowId] || {};
        const result = [];
        for (const [nodeId, credential] of Object.entries(credentials)) {
            result.push({ nodeId, credential });
        }
        return result;
    }
}

module.exports = InMemoryCredentialsStorage;
