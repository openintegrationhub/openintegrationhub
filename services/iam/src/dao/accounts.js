const Logger = require('@basaas/node-logger');
const { Event, EventBusManager } = require('@openintegrationhub/event-bus');
const Account = require('../models/account');
const CONF = require('../conf');

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
            .populate('roles')
            .lean();
    },

    create: async ({ userObj }) => {

        const account = new Account({
            confirmed: true,
            ...userObj,
        });

        await account.setPassword(userObj.password);

        await account.save();

        logger.debug('created.account', { ...userObj, password: '***' });

        auditLog.info('create.account', { data: { username: userObj.username } });

        const event = new Event({
            headers: {
                name: 'iam.user.created',
            },
            payload: { username: userObj.username, id: account._id.toString() },
        });
        EventBusManager.getEventBus().publish(event);

        return account.toJSON();
    },

    update: async (query, payload, opts) => {

        const updateOperation = opts.partialUpdate ? { $set: payload } : payload;

        const update = await Account.findOneAndUpdate({
            _id: query._id,
        }, updateOperation);

        logger.debug('updated.account', { ...payload, password: '***' });

        auditLog.info('update.account', {
            data: {
                userId: query._id,
                props: { ...payload, password: '***' },
                partialUpdate: opts.partialUpdate,
            },
        });
        const event = new Event({
            headers: {
                name: 'iam.user.modified',
            },
            payload: { username: payload.username, id: update._id.toString() },
        });
        EventBusManager.getEventBus().publish(event);

        if (payload.password && payload.password.length) {
            await update.setPassword(payload.password);
            await update.save();
            auditLog.info('update.account.password', { data: { userId: query._id } });
            logger.debug('updated.account.password', { id: query._id });
        }
    },

    delete: async (query) => {

        const accounts = await Account.find(query);

        /* eslint-disable-next-line no-restricted-syntax  */
        for (const account of accounts) {
            /* eslint-disable-next-line no-await-in-loop  */
            await AccountDAO.deleteOne({ id: account._id });
        }

    },

    deleteOne: async ({ id }) => {

        await Account.deleteOne({ _id: id });
        logger.debug('deleted.account', { id });
        auditLog.info('delete.account', { data: { userId: id } });

        const event = new Event({
            headers: {
                name: 'iam.user.deleted',
            },
            payload: { id: id.toString() },
        });
        EventBusManager.getEventBus().publish(event);

    },

    assignUserToTenantWithRole: async ({
        userId, tenantId, roles, permissions,
    }) => {
        const userAccount = await Account.findOne({
            _id: userId,
        });
        userAccount.tenant = tenantId;
        userAccount.roles = roles;

        await userAccount.save();
        const event = new Event({
            headers: {
                name: 'iam.user.assignedToTenant',
            },
            payload: { user: userId.toString(), tenant: tenantId.toString() },
        });
        EventBusManager.getEventBus().publish(event);
        return userAccount.toJSON();
    },

    removeUserFromTenant: async ({ userId, tenantId }) => {

        const userAccount = await Account.findOne({
            _id: userId,
        });
        userAccount.memberships = userAccount.memberships.filter((elem) => elem.tenant.toString() !== tenantId);
        await userAccount.save();
        const event = new Event({
            headers: {
                name: 'iam.user.removedFormTenant',
            },
            payload: { user: userId.toString(), tenant: tenantId.toString() },
        });
        EventBusManager.getEventBus().publish(event);
        return userAccount.toJSON();
    },

    getUsersAssignedToTenant: async ({ tenantId }) => Account.find({
        tenant: tenantId,
    }, {
        'username': 1,
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
