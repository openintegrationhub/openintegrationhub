const Schema = require('../../model/Schema');

module.exports = {

    async countBy(query) {
        return await Schema.countDocuments(query);
    },
    async createUpdate(obj) {
        await Schema.updateOne({ uri: obj.uri }, obj, { upsert: true });
    },

    async findByDomainWithPagination({
        domainId,
        entityId,
        options,
    }) {
        return await Schema.find({
            domainId,
            'owners.id': entityId,
        },
        'name domainId description uri value owners',
        options);
    },
    async findByURI(uri) {
        const schema = await Schema.findOne({
            uri,
        });
        schema.value = JSON.parse(schema.value);
        return schema.toObject();
    },
};
