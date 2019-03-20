const Schema = require('../../model/Schema');

async function getReferences(uri) {
    return (await Schema.find({ refs: uri })).map(elem => elem.uri);
}

module.exports = {
    async countBy(query) {
        return await Schema.countDocuments(query);
    },
    async createUpdate(obj) {
        return await Schema.updateOne({ uri: obj.uri }, obj, { upsert: true });
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
    async delete(uri) {
        const refs = await getReferences(uri);

        if (!refs.length) {
            await Schema.deleteOne({
                uri,
            });
        } else {
            throw new Error(`${uri} referenced by ${refs.toString()}`);
        }
    },
};
