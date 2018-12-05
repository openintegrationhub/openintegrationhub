const AuthClient = require('../model/AuthClient');

module.exports = {

    async create(obj) {
        const client = new AuthClient[obj.type]({ ...obj });
        await client.save();
        return client;
    },

    async findByEntity(entityId) {
        return await AuthClient.full.find({
            'owner.entityId': entityId,
        }).lean();
    },

    async findById(id) {
        return await AuthClient.full.findById(id).lean();
    },

    async findOne(query) {
        return await AuthClient.full.findOne(query).lean();
    },

    // findByEntity: async entityId => await Secret.full.find({
    //     'owner.entityId': entityId,
    // }).lean(),

    // find: async query => await Secret.full.find(query).lean(),

    // findOne: async query => await Secret.full.findOne(query).lean(),

    // update: async ({ id, obj, partialUpdate = false }) => {
    //     const updateOperation = partialUpdate ? { $set: obj } : obj;

    //     await Secret.full.findOneAndUpdate({
    //         _id: id,
    //     }, updateOperation);

    //     log.debug('updated.secret', { id });
    // },

    // delete: async ({ id }) => {
    //     await Secret.full.deleteOne({ _id: id });
    //     log.info('deleted.secret', { id });
    // },

};
