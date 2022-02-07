const Logger = require('@basaas/node-logger');
const CONF = require('../conf');

const log = Logger.getLogger(`${CONF.general.loggingNameSpace}/keyDao`);
const auditLog = Logger.getAuditLogger('key');

const Key = require('../models/key');

const KeyDAO = {
    async findByTenant(tenant) {
        const key = await Key.findOne({ tenant }).lean();
        return (key && key.value) || null;
    },

    async create(tenant, value) {
        const key = new Key({ tenant, value });
        await key.save();
    },

    async deleteByTenant(tenant) {
        log.debug('delete.key for tenant ', { tenant });

        await Key.deleteOne({ tenant });
        log.debug('deleted.key for tenant ', { tenant });
        auditLog.info('deleted.key for tenant ', { data: { tenant } });
    },
};

module.exports = KeyDAO;
