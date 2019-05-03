const mongoose = require('mongoose');
const Schema = require('../../model/Schema');

async function getReferences(uri) {
    return (await Schema.find({ refs: uri })).map(elem => elem.uri);
}

module.exports = {
    async startTransaction() {
        const session = await mongoose.startSession();
        session.startTransaction();
        return session;
    },

    async abortTransaction(session) {
        await session.abortTransaction();
    },
    async endTransaction(session) {
        await session.commitTransaction();
    },

    async createCollection() {
        await Schema.createCollection();
    },
    async countBy(query) {
        return await Schema.countDocuments(query);
    },

    async create({ obj, options = {} }) {
        return await Schema.create([obj], options);
    },
    async createUpdate({ obj, options = {} }) {
        options = {
            upsert: true,
            ...options,
        };
        return await Schema.updateOne({ uri: obj.uri }, obj, options);
    },
    async findByDomainAndEntity({
        domainId,
        entityId,
        options = {},
    }) {
        return await Schema.find({
            domainId,
            'owners.id': entityId,
        },
        'name domainId description uri value owners',
        options);
    },
    async findByURI({
        uri,
        options = {},
    }) {
        const schema = await Schema.findOne({
            uri,
        }, null, options);

        if (!schema) {
            return null;
        }

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
