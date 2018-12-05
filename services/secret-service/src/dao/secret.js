const Logger = require('@basaas/node-logger');
const Secret = require('../model/Secret');

const conf = require('./../conf');

const log = Logger.getLogger(`${conf.logging.namespace}/secretsDao`);

module.exports = {
    async create(obj) {
        const secret = new Secret[obj.type]({ ...obj });
        await secret.save();
        return secret;
    },
    async findByEntity(entityId) {
        return await Secret.full.find({
            'owner.entityId': entityId,
        });
    },

    async findBySubAndAuthClientId(sub, authClientId) {
        return await Secret.full.findOne({
            'value.sub': sub,
            'value.authClientId': authClientId,
        });
    },
    async find(query) {
        return await Secret.full.find(query);
    },
    async findOne(query) {
        return await Secret.full.findOne(query);
    },
    async update({ id, obj, partialUpdate = false }) {
        const updateOperation = partialUpdate ? { $set: obj } : obj;

        await Secret.full.findOneAndUpdate({
            _id: id,
        }, updateOperation);

        log.debug('updated.secret', { id });
    },
    async delete({ id }) {
        await Secret.full.deleteOne({ _id: id });
        log.info('deleted.secret', { id });
    },

};
