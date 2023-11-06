const CredentialsStorage = require('./CredentialsStorage');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema({
    flowId: {
        type: String,
    },
    nodeId: {
        type: String,
    },
    componentId: {
        type: String,
    },
    credential: {
        username: String,
        password: String,
    },
});
schema.index(
    { flowId: 1, nodeId: 1 },
    { unique: true, partialFilterExpression: { flowId: { $exists: true }, nodeId: { $exists: true } } }
);
schema.index({ componentId: 1 }, { unique: true, partialFilterExpression: { componentId: { $exists: true } } });

const RabbitMqCredential = mongoose.model('RabbitMqCredential', schema);
RabbitMqCredential.createIndexes();

class MongoDbCredentialsStorage extends CredentialsStorage {
    async get(flowId, nodeId) {
        const query = {
            flowId,
            nodeId,
        };
        const found = await RabbitMqCredential.findOne(query);
        return found ? found.credential.toObject() : null;
    }

    async set(flowId, nodeId, credential) {
        const query = {
            flowId,
            nodeId,
        };
        const cred = (await RabbitMqCredential.findOne(query)) || new RabbitMqCredential(query);
        cred.credential = credential;
        await cred.save();
    }

    async remove(flowId, nodeId) {
        const query = {
            flowId,
            nodeId,
        };
        await RabbitMqCredential.deleteMany(query);
    }

    async getForGlobalComponent(componentId) {
        const query = {
            componentId,
        };
        const found = await RabbitMqCredential.findOne(query);
        return found ? found.credential.toObject() : null;
    }

    async setForGlobalComponent(componentId, credential) {
        const query = {
            componentId,
        };
        const cred = (await RabbitMqCredential.findOne(query)) || new RabbitMqCredential(query);
        cred.credential = credential;
        await cred.save();
    }

    async removeForGlobalComponent(componentId) {
        const query = {
            componentId,
        };
        await RabbitMqCredential.deleteMany(query);
    }

    async getAllForFlow(flowId) {
        return ((await RabbitMqCredential.find({ flowId })) || []).map(({ nodeId, credential }) => ({
            nodeId,
            credential: credential.toObject(),
        }));
    }

    async clear() {
        await RabbitMqCredential.deleteMany();
    }
}

module.exports = MongoDbCredentialsStorage;
