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

        return Account.findOne(query)
            .populate('memberships.roles')
            .lean();
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
        userId, tenantId, roles, permissions,
    }) => {
        const userAccount = await Account.findOne({
            _id: userId,
        });
        userAccount.memberships = userAccount.memberships.filter(elem => elem.tenant.toString() !== tenantId);
        const newMembership = {
            tenant: tenantId,
            roles,
            permissions,
        };
        if (!userAccount.memberships.find(elem => elem.active === true)) {
            newMembership.active = true;
        }
        userAccount.memberships.push(newMembership);
        await userAccount.save();
        return userAccount.toJSON();
    },

    removeUserFromTenant: async ({ userId, tenantId }) => {

        const userAccount = await Account.findOne({
            _id: userId,
        });
        userAccount.memberships = userAccount.memberships.filter(elem => elem.tenant.toString() !== tenantId);
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
        'memberships.active': true,
    }).lean(),

    userHasContext: async ({ userId, tenantId }) => Account.findOne({
        _id: userId,
        memberships: { $elemMatch: { tenant: tenantId } },
    }).lean(),

    setCurrentContext: async ({ userId, tenantId }) => {

        const userAccount = await Account.findOne({
            _id: userId,
        });

        userAccount.memberships.forEach((membership) => {
            if (membership.tenant !== tenantId) {
                delete membership.active;
            } else {
                membership.active = true;
            }
        });

        await userAccount.save();
        return userAccount.toJSON();

    },

    removeTenantRoleFromAllAffectedUsers: async ({ tenant, role }) => {

        await Account.update({
            memberships: { $elemMatch: { tenant } },
        }, { $pull: { 'memberships.$.roles': role } }, { multi: true });

        logger.debug('deleted.membership.role', { tenant, role });
        auditLog.info('delete.membership.role', { data: { tenant, role } });

    },

};

module.exports = AccountDAO;
