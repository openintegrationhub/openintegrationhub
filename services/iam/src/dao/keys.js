const Logger = require('@basaas/node-logger');
const { ObjectId } = require('mongoose').Types;
const Key = require('./../models/key');
const CONF = require('./../conf');

// const log = Logger.getLogger(`${CONF.general.loggingNameSpace}/keyDao`);
// const auditLog = Logger.getAuditLogger('key');

const KeyDAO = {

    async findByTenant(tenant) {
        const key = await Key.findOne({ tenant }).lean();
        return key;
    },

    async create(tenant, value) {
        const key = new Key({ tenant, value });
        await key.save();
    },

};

module.exports = KeyDAO;
