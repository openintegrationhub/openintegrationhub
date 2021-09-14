const Logger = require('@basaas/node-logger');
const { Event, EventBusManager } = require('@openintegrationhub/event-bus');
const Account = require('../models/account');
const Role = require('../models/role');
const Permission = require('../models/permission');
const CONF = require('../conf');
const AccountDAO = require('./accounts');

const log = Logger.getLogger(`${CONF.general.loggingNameSpace}/roleDao`);
const auditLog = Logger.getAuditLogger('role');

const RolesDAO = {

    find: (filter) => {

        const query = filter || {};

        return Role.find(query)
            // .populate('permissions', 'name')
            .lean();
    },

    findOne: (filter) => {
        const query = filter || {};

        return Role.findOne(query)
            // .populate('permissions', 'name')
            .lean();
    },

    create: async (data) => {

        const instance = new Role(data);

        await instance.save();

        if (data.tenant) {
            data.tenant = data.tenant.toString();
        }

        log.debug('created.role', { ...data });
        const event = new Event({
            headers: {
                name: 'iam.role.created',
            },
            payload: {
                role: data.name,
                tenant: data.tenant,
            },
        });
        EventBusManager.getEventBus().publish(event);
        auditLog.info('create.role', { data });
        return instance.toJSON();
    },

    update: async ({ id, props }) => {

        log.debug('update.role', { id, props });

        const updatedEntity = await Role.findOneAndUpdate({
            _id: id,
        }, { $set: props });

        log.debug('updated.role', { id, props });
        const event = new Event({
            headers: {
                name: 'iam.role.modified',
            },
            payload: {
                role: id.toString(),
                permissions: props.permissions,
                tenant: props.tenant,
            },
        });
        EventBusManager.getEventBus().publish(event);
        auditLog.info('update.role', { data: props, id });

        return updatedEntity.toJSON();

    },

    delete: async ({ id, tenant }) => {

        await Account.updateMany({
            tenant,
        }, {
            $pull: { 'roles': id },
        });

        await Role.deleteOne({ _id: id, tenant });

        const event = new Event({
            headers: {
                name: 'iam.role.deleted',
            },
            payload: {
                role: id.toString(),
                tenant,
            },
        });
        EventBusManager.getEventBus().publish(event);
        log.debug('deleted.role', { id });
        auditLog.info('delete.role', { data: { id } });

        // TODO: use transactions starting from Mondob v.4.x
        // const session = await Role.startSession();
        // session.startTransaction();
        // try {
        //     const opts = { session };
        //
        //     await Account.update({
        //         memberships: { $elemMatch: { tenant: tenant, id } }
        //     }, { $pull: { role: 1 } }, { multi: true, ...opts });
        //
        //     await Role.deleteOne({ _id: id, tenant }, opts);
        //
        //     await session.commitTransaction();
        //     session.endSession();
        //
        //     log.debug('deleted.role', { id });
        //     auditLog.info('delete.role', { data: { id } });
        //
        //     return true;
        // } catch (error) {
        //     // If an error occurred, abort the whole transaction and
        //     // undo any changes that might have happened
        //     await session.abortTransaction();
        //     session.endSession();
        //     throw error;
        // }

    },

    userIsOwnerOfRole: async ({ roleId, user }) => {

        if (user.isAdmin) {
            return true;
        }

        const doc = Role.findOne({
            _id: roleId,
            tenant: user.tenant,
        }).lean();

        return !!doc;
    },

    getTenantRoles: async ({ roles, tenant }) => {

        if (!roles) {
            return Role.find({ tenant }).lean();
        }

        return Role.find({ tenant, _id: { $in: roles } }).lean();

    },

};

module.exports = RolesDAO;
