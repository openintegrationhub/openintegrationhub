const CredentialsStorage = require('./CredentialsStorage');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema({
    flowId: {
        type: String
    },
    nodeId: {
        type: String
    },
    credential: {
        username: String,
        password: String
    }
});
schema.index({flowId: 1, nodeId: 1}, {unique: true});

const RabbitMqCredential = mongoose.model('RabbitMqCredential', schema);

class MongoDbCredentialsStorage extends CredentialsStorage {
    async get(flowId, nodeId) {
        const query = {
            flowId,
            nodeId
        };
        const found = await RabbitMqCredential.findOne(query);
        return found ? found.credential : null;
    }

    async set(flowId, nodeId, credential) {
        const query = {
            flowId,
            nodeId
        };
        const cred = await RabbitMqCredential.findOne(query) || new RabbitMqCredential(query);
        cred.credential = credential;
        await cred.save();
    }

    async remove(flowId, nodeId) {
        const query = {
            flowId,
            nodeId
        };
        await RabbitMqCredential.deleteMany(query);
    }

    async getAllForFlow(flowId) {
        return (await RabbitMqCredential.find({flowId}) || []);
    }
}

module.exports = MongoDbCredentialsStorage;
