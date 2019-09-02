const { Event, EventBusManager } = require('@openintegrationhub/event-bus');
const { isTenantAdmin } = require('@openintegrationhub/iam-utils');
const Domain = require('../../model/Domain');
const Schema = require('../../model/Schema');

module.exports = {

    async createCollection() {
        await Domain.createCollection();
    },
    async countBy(query) {
        return await Domain.countDocuments(query);
    },

    async create({ obj, options = {} }) {
        return (await Domain.create([obj], options))[0];
    },
    async updateById(obj) {
        return await Domain.findOneAndUpdate({ _id: obj.id }, obj, { new: true });
    },

    async findOne(query) {
        return await Domain.findOne(query);
    },
    async findByEntityWithPagination(
        requester,
        props,
    ) {
        const query = {
            $or: [
                {
                    tenant: requester.tenant,
                },
                {
                    public: true,
                },
                {
                    owners: {
                        $in: [{
                            id: requester.sub,
                            type: 'USER',
                        }]
                    }
                }

            ]

        };
        return await Domain.find(query,
        'name description public owners',
        props);
    },
    async delete(id) {
        await Schema.deleteMany({ domainId: id });
        await Domain.deleteOne({
            _id: id,
        });
        const event = new Event({
            headers: {
                name: 'metadata.domain.deleted',
            },
            payload: { schema: id },
        });
        EventBusManager.getEventBus().publish(event);
    },

    async deleteAll({ tenant }) {

        const toBeDeleted = await Domain.find({ tenant });
        for (const domain of toBeDeleted) {
            await module.exports.delete(domain._id);
        }
    },
};
