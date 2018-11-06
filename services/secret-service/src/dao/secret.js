const Logger = require('@basaas/node-logger');
const Secret = require('../model/Secret');

const conf = require('./../conf');

const log = Logger.getLogger(`${conf.logging.namespace}/secretsDao`);
const auditLog = Logger.getAuditLogger('secretsDao');

module.exports = {

    create: async (obj) => {
        const secret = new Secret[obj.type]({ ...obj });
        await secret.save();
        return secret;
    },

    findByEntity: async entityId => await Secret.full.find({
        'owner.entityId': entityId,
    }).lean(),

    find: async (query) => {
        return await Secret.full.find(query).lean();
    },

    findOne: async (query) => {
        return await Secret.full.findOne(query).lean();
    },

    update: async ({ id, obj, partialUpdate = false }) => {

        const updateOperation = partialUpdate ? { $set: obj } : obj;

        await Secret.full.findOneAndUpdate({
            _id: id,
        }, updateOperation);

        log.debug('updated.secret', { id });

    },

    delete: async ({ id }) => {
        await Secret.full.deleteOne({ _id: id });
        log.info('deleted.secret', { id });
    },

};
