const mongoose = require('mongoose');
const { Event, EventBusManager } = require('@openintegrationhub/event-bus');
const Schema = require('../../model/Schema');

async function getReferences(uri) {
    return (await Schema.find({ refs: uri })).map(elem => elem.uri);
}

// async function updateReferences({ oldUri, newUri }) {
//     await Schema.updateMany({
//         refs: oldUri,
//     },
//     {
//         $set: { 'refs.$': newUri },
//     });
// }

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
        const result = (await Schema.create([obj], options))[0];
        const event = new Event({
            headers: {
                name: 'metadata.schema.created',
            },
            payload: { id: result._id },
        });
        EventBusManager.getEventBus().publish(event);
        return result;
    },
    async updateByURI(obj) {
        const uri = obj.uri;
        delete obj.uri;

        const result = await Schema.findOneAndUpdate({ uri }, obj, {
            new: true,
            runValidators: true,
        });
        const event = new Event({
            headers: {
                name: 'metadata.schema.modified',
            },
            payload: { id: result._id },
        });
        EventBusManager.getEventBus().publish(event);
        return result;
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
        null,
        options);
    },

    async findByDomain({
        domainId,
        options = {},
    }) {
        return await Schema.find({
            domainId,
        },
        null,
        options);
    },
    async findByURI({
        uri,
        options = {},
    }) {
        let schema = await Schema.findOne({
            uri,
        }, null, options);

        if (!schema) {
            return null;
        }
        schema = schema.toObject();
        schema.value = JSON.parse(schema.value);
        return schema;
    },
    async delete(uri) {
        const refs = await getReferences(uri);

        if (!refs.length) {
            await Schema.deleteOne({
                uri,
            });
            const event = new Event({
                headers: {
                    name: 'metadata.schema.deleted',
                },
                payload: { schema: uri },
            });
            EventBusManager.getEventBus().publish(event);
        } else {
            throw new Error(`${uri} referenced by ${refs.toString()}`);
        }
    },
};
