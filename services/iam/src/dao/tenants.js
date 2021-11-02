const Logger = require('@basaas/node-logger');
const { Event, EventBusManager } = require('@openintegrationhub/event-bus');
const Tenant = require('../models/tenant');
const CONF = require('../conf');
const AccountDAO = require('./accounts');

const log = Logger.getLogger(`${CONF.general.loggingNameSpace}/tenantDao`);
const auditLog = Logger.getAuditLogger('tenant');

const TenantDAO = {

    find: (filter) => {

        const query = filter || {};

        return Tenant.find(query);
    },

    findOne: (filter) => {

        const query = filter || {};

        return Tenant.findOne(query);
    },

    create: async ({ props }) => {

        log.debug('create.tenant', props);

        const entity = new Tenant(props);

        const savedEntity = await entity.save();

        auditLog.info('create.tenant', { data: savedEntity.toObject() });

        const event = new Event({
            headers: {
                name: 'iam.tenant.created',
            },
            payload: { tenant: savedEntity.toObject(), id: savedEntity._id.toString() },
        });
        EventBusManager.getEventBus().publish(event);

        return savedEntity.toJSON();

    },

    update: async ({ id, props, partialUpdate = false }) => {

        log.debug('update.tenant', { id, props });

        const updateOperation = partialUpdate ? { $set: props } : props;

        await Tenant.findOneAndUpdate({
            _id: id,
        }, updateOperation);

        log.debug('updated.tenant', { id, props });
        const event = new Event({
            headers: {
                name: 'iam.tenant.modified',
            },
            payload: { id: id.toString() },
        });
        EventBusManager.getEventBus().publish(event);
        auditLog.info('update.tenant', { data: props, id });

    },

    delete: async ({ id }) => {

        log.debug('delete.tenant', { id });

        await AccountDAO.delete({ tenant: id });

        await Tenant.deleteOne({ _id: id });
        log.debug('deleted.tenant', { id });
        auditLog.info('delete.tenant', { data: { id } });
        const event = new Event({
            headers: {
                name: 'iam.tenant.deleted',
            },
            payload: { id: id.toString() },
        });
        EventBusManager.getEventBus().publish(event);
    },

    getUsersAssignedToTenant: async ({ id }) => AccountDAO.getUsersAssignedToTenant({ tenantId: id }),

};

module.exports = TenantDAO;
