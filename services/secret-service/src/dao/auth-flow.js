const AuthFlow = require('../model/AuthFlow');

module.exports = {

    async create(obj) {
        const authFlow = new AuthFlow({ ...obj });
        await authFlow.save();
        return authFlow;
    },

    async findById(id) {
        return await AuthFlow.findById(id).lean();
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
