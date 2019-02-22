const Domain = require('../model/Domain');

module.exports = {

    async create(obj) {
        const authFlow = new Domain({ ...obj });
        await authFlow.save();
        return authFlow;
    },

    async findById(id) {
        return await Domain.findById(id).lean();
    },

    async delete(id) {
        return await Domain.deleteOne({
            _id: id,
        });
    },

};
