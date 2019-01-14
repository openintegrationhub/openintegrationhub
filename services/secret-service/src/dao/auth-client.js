const Logger = require('@basaas/node-logger');
const AuthClient = require('../model/AuthClient');

const conf = require('./../conf');

const log = Logger.getLogger(`${conf.logging.namespace}/authClientDao`);

module.exports = {

    async create(obj) {
        const client = new AuthClient[obj.type]({ ...obj });
        await client.save();
        return client;
    },

    async find(query = {}) {
        return await AuthClient.full
            .find(query, 'name type')
            .lean();
    },

    async findByEntity(entityId) {
        return await AuthClient.full.find({
            'owners.entityId': entityId,
        }).lean();
    },

    async findById(id) {
        return await AuthClient.full.findById(id).lean();
    },

    async findOne(query) {
        return await AuthClient.full.findOne(query).lean();
    },

    async update({ id, obj, partialUpdate = false }) {
        const updateOperation = partialUpdate ? { $set: obj } : obj;

        await AuthClient.full.findOneAndUpdate({
            _id: id,
        }, updateOperation);

        log.debug('updated.client', { id });
    },

    async delete({ id }) {
        await AuthClient.full.deleteOne({ _id: id });
        log.info('deleted.client', { id });
    },

};
