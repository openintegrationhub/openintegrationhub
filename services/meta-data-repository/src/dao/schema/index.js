const Schema = require('../../model/Schema');

module.exports = {

    async countByEntity(id) {
        return await Schema.countDocuments({
            'owners.id': id,
        });
    },
    async createUpdate(obj) {
        await Schema.updateOne({ uri: obj.uri }, obj, { upsert: true });
    },

    async findByEntityWithPagination(
        id,
        props,
    ) {
        return await Schema.find({
            'owners.id': id,
        },
        'name description uri value owners',
        props);
    },
    async findByURI(uri) {
        const schema = await Schema.findOne({
            uri,
        });
        schema.value = JSON.parse(schema.value);
        return schema.toObject();
    },
};
