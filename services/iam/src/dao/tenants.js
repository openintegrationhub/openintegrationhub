const Tenant = require('./../models/tenant');
const CONF = require('./../conf');
const Logger = require('@basaas/node-logger');
const UserDAO = require('./users');

const log = Logger.getLogger(`${CONF.loggingNameSpace}/tenantDao`);
const auditLog = Logger.getAuditLogger('tenant');

const TenantDAO = {

    find: (filter) => {

        const query = filter || {};

        return Tenant.find(query);
    },

    create: async ({ props }) => {

        log.debug('create.tenant', props);

        const entity = new Tenant(props);

        const savedEntity = await entity.save();

        auditLog.info('create.tenant', { data: savedEntity.toObject() });

        return savedEntity.toJSON();

    },

    update: async ({ id, props, partialUpdate = false }) => {

        log.debug('update.tenant', { id, props });

        const updateOperation = partialUpdate ? { $set: props } : props;

        await Tenant.findOneAndUpdate({
            _id: id,
        }, updateOperation);

        log.info('updated.tenant', { id, props });
        auditLog.info('update.tenant', { data: props, id });

    },

    delete: async ({ id }) => {

        log.debug('delete.tenant', { id });

        await Tenant.deleteOne({ _id: id });
        log.info('deleted.tenant', { id });
        auditLog.info('delete.tenant', { data: { id } });
    },

    getUsersAssignedToTenant: async ({ id }) => UserDAO.getUsersAssignedToTenant({ tenantId: id }),

};

module.exports = TenantDAO;
