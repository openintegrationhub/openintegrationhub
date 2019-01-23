const Logger = require('@basaas/node-logger');
const Account = require('./../models/account');
const CONF = require('./../conf');

const logger = Logger.getLogger(`${CONF.general.loggingNameSpace}/accountDao`);
const auditLog = Logger.getAuditLogger('account');

const AccountDAO = {

    find: (filter) => {

        const query = filter || {};

        return Account.find(query).lean();
    },

    findOne: (filter) => {
        const query = filter || {};

        return Account.findOne(query).lean();
    },

    create: async ({ userObj }) => {

        const account = new Account({
            confirmed: true,
            ...userObj,
        });

        await account.setPassword(userObj.password);

        await account.save();

        logger.debug('created.account', Object.assign({}, userObj, { password: '***' }));

        auditLog.info('create.account', { data: { username: userObj.username } });
        return account.toJSON();
    },

    update: async ({
        id, userObj, partialUpdate = false, method, 
    }) => {

        const updateOperation = partialUpdate ? { $set: userObj } : userObj;

        const update = await Account.findOneAndUpdate({
            _id: id,
        }, updateOperation);

        logger.debug('updated.account', Object.assign({}, userObj, { password: '***' }));

        auditLog.info('update.account', {
            data: {
                userId: id,
                props: Object.assign({}, userObj, { password: '***' }),
                method,
            },
        });

        if (userObj.password && userObj.password.length) {
            await update.setPassword(userObj.password);
            await update.save();
            auditLog.info('update.account.password', { data: { userId: id } });

            logger.debug('updated.account.password', { id });
        }
    },

    delete: async ({ id }) => {

        await Account.deleteOne({ _id: id });
        logger.debug('deleted.account', { id });
        auditLog.info('delete.account', { data: { userId: id } });
    },

    assignUserToTenantWithRole: async ({
        userId, tenantId, role, permissions, 
    }) => {
        const userAccount = await Account.findOne({
            _id: userId,
        });
        userAccount.memberships = userAccount.memberships.filter(elem => elem.tenant.toString() !== tenantId);
        const newMembership = {
            tenant: tenantId,
            role,
            permissions,
        };
        userAccount.memberships.push(newMembership);
        userAccount.currentContext = userAccount.currentContext || newMembership;
        await userAccount.save();
        return userAccount.toJSON();
    },

    removeUserFromTenant: async ({ userId, tenantId }) => {

        const userAccount = await Account.findOne({
            _id: userId,
        });
        userAccount.memberships = userAccount.memberships.filter(elem => elem.tenant.toString() !== tenantId);
        if (userAccount.currentContext && userAccount.currentContext.tenant === tenantId) {
            userAccount.currentContext = {};
        }
        await userAccount.save();
        return userAccount.toJSON();
    },

    getUsersAssignedToTenant: async ({ tenantId }) => Account.find({
        'memberships': { $elemMatch: { tenant: tenantId } },
    }, {
        'username': 1,
        'memberships.$': 1,
    }).lean(),

    getCurrentContext: async ({ userId }) => Account.findOne({
        _id: userId,
    }, {
        currentContext: 1,
    }).lean(),

    userHasContext: async ({ userId, tenantId }) => Account.findOne({
        _id: userId,
        memberships: { $elemMatch: { tenant: tenantId } },
    }).lean(),

    setCurrentContext: async ({ userId, tenantId }) => {

        const userAccount = await Account.findOne({
            _id: userId,
        });

        userAccount.currentContext = userAccount.memberships.find(elem => elem.tenant.toString() === tenantId) || {};
        await userAccount.save();
        return userAccount.toJSON();

    },

    removeTenantRoleFromAllAffectedUsers: async ({ tenant, role }) => {

        await Account.update({
            memberships: { $elemMatch: { tenant, role } },
        }, { $pull: { role: 1 } }, { multi: true });

        logger.debug('deleted.membership.role', { tenant, role });
        auditLog.info('delete.membership.role', { data: { tenant, role } });

    },

};

module.exports = AccountDAO;
