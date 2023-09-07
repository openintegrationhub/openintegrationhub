const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();
const { ObjectId } = mongoose.Types;

const Logger = require('@basaas/node-logger');
const CONF = require('../conf');
const CONSTANTS = require('../constants');
const auth = require('../util/auth');
const Util = require('../util/common');
const AccountDAO = require('../dao/accounts');
const RolesDAO = require('../dao/roles');
const TokenDAO = require('../dao/tokens');
const { RESTRICTED_PERMISSIONS, PERMISSIONS, permissionsAreCommon } = require('../access-control/permissions');

const log = Logger.getLogger(`${CONF.general.loggingNameSpace}/user`, {
    level: 'debug',
});

const rolesBelongToTenant = async (roles, tenant) => {
    const tenantRoles = (await RolesDAO.find({ tenant })).map((role) => role._id.toString());
    const falseRoles = roles.filter((role) => tenantRoles.indexOf(role) < 0);
    return falseRoles.length === 0;
};

const sanitizeUserObj = async (req, res, next) => {

    const userObj = req.body;

    if (!req.user.isAdmin) {
        /* eslint-disable-next-line no-restricted-syntax  */
        if (userObj.roles && userObj.roles.length && !(await rolesBelongToTenant(userObj.roles, req.user.tenant))) {
            // userObj.roles = await filterByTenantRolesOnly(userObj.roles, req.user.tenant);
            log.warn(`Unauthorized attempt to assign a role by user ${req.user.userid}`, { roles: userObj.roles, tenant: req.user.tenant });
            return next({
                status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN, details: 'Restricted role used',
            });
        }
        /* eslint-disable-next-line no-restricted-syntax  */
        if (userObj.permissions && !permissionsAreCommon(userObj.permissions)) {
            log.warn(`An attempt to assign an uncommon permission to a role by user ${req.user.userid}`, { permissions: userObj.permissions });
            return next({
                status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN, details: 'Restricted permission used',
            });
        }
        req.body.tenant = req.user.tenant;
    }

    return next();
};

/**
 * Create a new user
 * */
router.post('/', auth.hasTenantPermissions([PERMISSIONS['tenant.account.create']]), sanitizeUserObj, async (req, res, next) => {

    const userObj = req.body;

    try {

        const doc = await AccountDAO.create({ userObj });

        if (req.query.meta) {
            return res.send({ data: { id: doc._id } });
        }

        return res.send({ id: doc._id });

    } catch (err) {
        if (err.name === 'ValidationError') {
            log.debug(err);
            return next({
                status: 400,
                message: CONSTANTS.ERROR_CODES.INPUT_INVALID,
            });
        } else if (/duplicate/.test(err.message)) {
            return next({
                status: 409,
                message: CONSTANTS.ERROR_CODES.DUPLICATE_KEY,
            });
        } else {
            return next(err);
        }
    }
});

/**
 * Get all Users
 */
router.get('/', auth.isAdmin, async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.userId) {
            const userIds = req.query.userId;
            try {
                const filterUsers = Array.isArray(userIds) ? userIds.map((userId) => ObjectId(userId)) : [ObjectId(userIds)];

                filter._id = {
                    $in: filterUsers,
                };
            } catch (error) {
                return next({ status: 500, message: 'The filter is invalid.' });
            }
            
        }
        if (req.query.username) {
            const usernames = req.query.username;
            const filterUsernames = Array.isArray(usernames) ? usernames : [usernames];

            filter.username = {
                $in: filterUsernames,
            };
        }
        const doc = await AccountDAO.find(filter);

        if (req.query.meta) {
            return res.send({ data: doc, meta: { total: doc.length } });
        }

        return res.send(doc);
    } catch (err) {
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

/**
 * Get data of current user
 */
router.get('/me', auth.isLoggedIn, async (req, res, next) => {

    try {
        const doc = await AccountDAO.findOne({ _id: req.user.userid });

        if (req.query.meta) {
            return res.send({ data: doc });
        }

        return res.send(doc);
    } catch (err) {
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

router.patch('/me', auth.isLoggedIn, async (req, res, next) => {

    const userObj = Util.removeEmptyProps({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
    });
    const query = {
        _id: req.user.userid,
    };

    try {
        await AccountDAO.update(query, userObj, { partialUpdate: true });
        return res.sendStatus(200);
    } catch (err) {
        log.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

/**
 * Get user by id
 */
router.get('/:id', auth.hasTenantPermissions([PERMISSIONS['tenant.account.read']]), async (req, res, next) => {

    const query = { _id: req.params.id };

    if (!req.user.isAdmin) {
        query.tenant = req.user.tenant;
    }

    try {
        const doc = await AccountDAO.findOne(query);
        if (!doc) {
            return res.sendStatus(404);
        } else {
            if (req.query.meta) {
                return res.send({ data: doc });
            }
            return res.send(doc);
        }

    } catch (err) {
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

/**
 * Partial modify a user
 */
router.patch('/:id', auth.hasTenantPermissions([PERMISSIONS['tenant.account.update']]), sanitizeUserObj, async (req, res, next) => {

    const userObj = req.body;
    const query = {
        _id: req.params.id,
    };

    if (!req.user.isAdmin) {
        query.tenant = req.user.tenant;
    }

    try {
        await AccountDAO.update(query, userObj, { partialUpdate: true });
        return res.sendStatus(200);
    } catch (err) {
        log.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

/**
 * Complete modify of user data with given data
 * */
router.put('/:id', auth.hasTenantPermissions([PERMISSIONS['tenant.account.update']]), sanitizeUserObj, async (req, res, next) => {

    const userObj = req.body;
    const query = {
        _id: req.params.id,
    };

    if (!req.user.isAdmin) {
        query.tenant = req.user.tenant;
    }

    try {
        await AccountDAO.update(query, userObj, { partialUpdate: false });
        return res.sendStatus(200);
    } catch (err) {
        log.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }

});

/**
 * Delete a user
 */
router.delete('/:id', auth.can([RESTRICTED_PERMISSIONS['iam.account.delete']]), async (req, res, next) => {
    try {
        await AccountDAO.deleteOne({ id: req.params.id });
        await TokenDAO.deleteAllAccountTokens({ accountId: req.params.id });
        return res.sendStatus(200);
    } catch (err) {
        log.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

module.exports = router;
