const Logger = require('@basaas/node-logger');
const Account = require('./../models/account');
const Role = require('./../models/role');
const Permission = require('./../models/permission');
const CONF = require('./../conf');
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

        log.debug('created.role', Object.assign({}, data));

        auditLog.info('create.role', { data });
        return instance.toJSON();
    },

    update: async ({ id, props }) => {

        log.debug('update.role', { id, props });

        const updatedEntity = await Role.findOneAndUpdate({
            _id: id,
        }, { $set: props });

        log.info('updated.role', { id, props });
        auditLog.info('update.role', { data: props, id });

        return updatedEntity.toJSON();

    },

    delete: async ({ id, tenant }) => {

        await Account.updateMany({
            memberships: { $elemMatch: { tenant, role: id } },
        }, {
            $unset: { 'memberships.$.role': 1 },
        });

        await Account.updateMany({
            'currentContext.role': id,
        }, {
            $unset: { currentContext: 1 },
        });

        await Role.deleteOne({ _id: id, tenant });

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

};

module.exports = RolesDAO;
