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

    async getForGlobalComponent(componentId) {
        return this._store[componentId];
    }

    async setForGlobalComponent(componentId, credential) {
        this._store[componentId] = credential;
    }

    async removeForGlobalComponent(componentId) {
        if (this._store[componentId]) {
            delete this._store[componentId];
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
