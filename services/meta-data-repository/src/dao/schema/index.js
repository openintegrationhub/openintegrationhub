const Schema = require('../../model/Schema');

module.exports = {

    async createUpdate(obj) {
        await Schema.update({ uri: obj.uri }, obj, { upsert: true });
    },

    async findByURI(uri) {
        const schema = await Schema.findOne({
            uri,
        });
        schema.value = JSON.parse(schema.value);
        return schema.toObject();
    },
};
