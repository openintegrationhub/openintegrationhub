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

    async delete(id) {
        return await AuthFlow.deleteOne({
            _id: id,
        });
    },

};
