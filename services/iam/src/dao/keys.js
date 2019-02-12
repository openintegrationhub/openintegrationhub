const Key = require('./../models/key');

const KeyDAO = {

    async findByTenant(tenant) {
        const key = await Key.findOne({ tenant }).lean();
        return key.value;
    },

    async create(tenant, value) {
        const key = new Key({ tenant, value });
        await key.save();
    },

};

module.exports = KeyDAO;
