const Account = require('./../models/account');
const CONF = require('./../conf');
const Logger = require('@basaas/node-logger');

const log = Logger.getLogger(`${CONF.general.loggingNameSpace}/userDao`);
const auditLog = Logger.getAuditLogger('user');

const UserDAO = {

    find: (filter) => {

        const query = filter || {};

        return Account.find(query).lean();
    },

    findOne: (filter) => {
        const query = filter || {};

        return Account.findOne(query).lean();
    },

    create: async ({ userObj }) => {

        delete userObj.memberships;
        delete userObj.roles;

        const account = new Account({
            confirmed: true,
            ...userObj,
        });

        await account.setPassword(userObj.password);

        await account.save();

        log.debug('created.user', Object.assign({}, userObj, { password: '***' }));

        auditLog.info('create.user', { data: { username: userObj.username } });
        return account.toJSON();
    },

    update: async ({ id, userObj, partialUpdate = false, method }) => {

        const updateOperation = partialUpdate ? { $set: userObj } : userObj;

        const update = await Account.findOneAndUpdate({
            _id: id,
        }, updateOperation);

        log.debug('updated.user', Object.assign({}, userObj, { password: '***' }));

        auditLog.info('update.user', {
            data: {
                userId: id,
                props: Object.assign({}, userObj, { password: '***' }),
                method,
            },
        });

        if (userObj.password && userObj.password.length) {
            await update.setPassword(userObj.password);
            await update.save();
            auditLog.info('update.user.password', { data: { userId: id } });

            log.debug('updated.user.password', { id });
        }
    },

    delete: async ({ id }) => {

        await Account.deleteOne({ _id: id });
        log.debug('deleted.user', { id });
        auditLog.info('delete.user', { data: { userId: id } });
    },

    assignUserToTenantWithRole: async ({ userId, tenantId, role }) => {
        const userAccount = await Account.findOne({
            _id: userId,
        });
        userAccount.memberships = userAccount.memberships.filter(elem => elem.tenant.toString() !== tenantId);
        userAccount.memberships.push({
            tenant: tenantId,
            role,
        });
        await userAccount.save();
        return userAccount.toJSON();
    },

    removeUserFromTenant: ({ userId, tenantId }) => Account.findOneAndUpdate({
        _id: userId,
    }, {
        $pull: {
            memberships: { $elemMatch: { tenant: tenantId },
            },
        },
    }),

    getUsersAssignedToTenant: async ({ tenantId }) => Account.find({
        'memberships': { $elemMatch: { tenant: tenantId } },
    }, {
        'username': 1,
        'memberships.$': 1,
    }).lean(),

};

module.exports = UserDAO;
