const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const Logger = require('@basaas/node-logger');
const conf = require('../conf');
const CONSTANTS = require('../constants');
const auth = require('../util/auth');
const TenantDAO = require('../dao/tenants');
const AccountDAO = require('../dao/accounts');
const TokenDAO = require('../dao/tokens');
const RolesDAO = require('../dao/roles');
const KeyDAO = require('../dao/keys');
const { permissionsAreCommon, PERMISSIONS, RESTRICTED_PERMISSIONS } = require('../access-control/permissions');

const log = Logger.getLogger(`${conf.general.loggingNameSpace}/user`, {
    level: 'debug',
});

/**
 * Get all Tenants
 */
router.get('/', auth.isAdmin, async (req, res, next) => {
    try {
        const doc = await TenantDAO.find({});
        if (req.query.meta) {
            return res.send({ data: doc, meta: { total: doc.length } });
        }
        return res.send(doc);
    } catch (err) {
        return next(err);
    }
});

/**
 * Create a new tenant
 */
router.post('/', auth.can([RESTRICTED_PERMISSIONS['iam.tenant.create']]), async (req, res, next) => {
    const tenantProperties = req.body;
    try {

        const tenant = await TenantDAO.create({ props: tenantProperties });

        // send reference
        return res.send({ id: tenant._id });

    } catch (err) {
        if (err.name === 'ValidationError') {
            log.error(err);
            return res.sendStatus(400);
        } else {
            log.error(err);
            return next(err);
        }

    }

});

/**
 * Get a specific tenant by id
 */
router.get('/:id/profile', auth.hasTenantPermissions([PERMISSIONS['tenant.profile.read']]), async (req, res, next) => {

    const tenantId = req.user.isAdmin ? req.params.id : req.user.tenant;

    try {
        const doc = await TenantDAO.findOne({ _id: tenantId });
        if (req.query.meta) {
            return res.send({ data: doc });
        }
        return res.send(doc);
    } catch (err) {
        return next(err);
    }
});

/**
 * Get a specific tenant by id
 */
router.get('/:id', auth.hasTenantPermissions([PERMISSIONS['tenant.profile.read']]), async (req, res, next) => {

    const tenantId = req.user.isAdmin ? req.params.id : req.user.tenant;

    try {
        const doc = await TenantDAO.findOne({ _id: tenantId });
        if (!doc) {
            return res.sendStatus(404);
        }
        if (req.query.meta) {
            return res.send({ data: doc });
        }
        return res.send(doc);
    } catch (err) {
        return next(err);
    }
});

/**
 * Modify tenant entirely
 * */
router.put('/:id', auth.hasTenantPermissions([PERMISSIONS['tenant.profile.update']]), async (req, res, next) => {

    const props = req.body;
    const tenantId = req.user.isAdmin ? req.params.id : req.user.tenant;

    try {
        await TenantDAO.update({ id: tenantId, props, partialUpdate: false });

        return res.sendStatus(200);
    } catch (err) {
        log.error(err);
        return next(err);
    }
});

/**
 * Modify tenant partially
 *
 * */
router.patch('/:id', auth.hasTenantPermissions([PERMISSIONS['tenant.profile.update']]), async (req, res, next) => {

    const props = req.body;
    const tenantId = req.user.isAdmin ? req.params.id : req.user.tenant;

    try {
        await TenantDAO.update({ id: tenantId, props, partialUpdate: true });

        return res.sendStatus(200);
    } catch (err) {
        log.error(err);
        return next(err);
    }
});

/**
 * Delete a tenant
 *
 * */
router.delete('/:id', auth.can([RESTRICTED_PERMISSIONS['iam.tenant.delete']]), async (req, res, next) => {

    try {
        await TenantDAO.delete({ id: req.params.id });
        return res.sendStatus(200);
    } catch (err) {
        log.error(err);
        return next({ status: 500, message: err });
    }

});

/**
 * Get all tenant users
 */
router.get('/:id/users', auth.hasTenantPermissions([PERMISSIONS['tenant.account.read']]), async (req, res, next) => {

    const tenantId = req.user.isAdmin ? req.params.id : req.user.tenant;

    try {
        const doc = await AccountDAO.find({ tenant: tenantId });
        if (req.query.meta) {
            return res.send({ data: doc, meta: { total: doc.length } });
        }
        return res.send(doc);
    } catch (err) {
        return next(err);
    }
});

// /**
//  * Get tenant user by id
//  */
// router.get('/:id/users/:userId', auth.hasTenantPermissions([PERMISSIONS['tenant.account.read']]), async (req, res, next) => {
//
//     const tenantId = req.user.isAdmin ? req.params.id : req.user.tenant;
//
//     try {
//         const doc = await AccountDAO.findOne({ _id: req.params.userId, tenant: tenantId });
//         log.debug(doc);
//         return res.send(doc);
//     } catch (err) {
//         return next(err);
//     }
// });

const roleBelongsToTenant = async ({ role, tenant }) => RolesDAO.findOne({
    role,
    tenant,
}).lean();

// /**
//  * Assign given user to the tenant
//  */
// router.post('/:id/users', auth.isTenantAdmin, async (req, res, next) => {
//
//     // TODO: switch to tenant context
//     const reqBody = req.body;
//     const tenantID = req.params.id;
//
//     if (!reqBody.user) {
//         return next({ status: 400, message: 'Missing user id' });
//     }
//
//     // if (await !roleBelongsToTenant({ role: reqBody.role, tenant: tenantID })) {
//     //     return next({ status: 400, message: `Role ${reqBody.role} does not belong to tenant ${tenantID}.` });
//     // }
//
//     if (reqBody.permissions && !permissionsAreCommon(reqBody.permissions)) {
//         log.warn(`An attempt to assign a restricted permission to user ${req.user.userid}`);
//         return next({
//             status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN, details: 'Restricted permission used',
//         });
//     }
//
//     try {
//         const doc = await AccountDAO.assignUserToTenantWithRole({
//             tenantId: tenantID,
//             roles: reqBody.roles,
//             userId: reqBody.user,
//             permissions: reqBody.permissions || [],
//         });
//         return res.send(doc);
//     } catch (err) {
//         log.error(err);
//         return next(err);
//     }
// });

/**
 * Remove the user from tenant
 */
router.delete('/:id/user/:userId', auth.hasTenantPermissions([PERMISSIONS['tenant.account.delete']]), async (req, res, next) => {

    let tenantId = req.params.id;

    if (!req.user.isAdmin) {
        tenantId = req.user.tenant;
    }

    const userExists = await AccountDAO.fineOne({ id: req.params.userId, tenant: tenantId }).lean();

    if (userExists) {
        try {
            await AccountDAO.deleteOne({ id: req.params.userId, tenant: tenantId });
            await TokenDAO.deleteAllAccountTokens({ accountId: req.params.userId });
            return res.sendStatus(200);
        } catch (err) {
            log.error(err);
            return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
        }
    } else {
        log.warn('An attempt was made to delete a user of another tenant');
        return next({ status: 400, message: 'User-Id and Tenant-Id mismatch' });
    }

});

router.post('/:id/key/', auth.can([RESTRICTED_PERMISSIONS['iam.key.create']]), async (req, res, next) => {
    const { value } = req.body;
    try {
        await KeyDAO.create(req.params.id, value);
        res.sendStatus(200);
    } catch (err) {
        next(err);
    }
});

router.get('/:id/key/', auth.can([RESTRICTED_PERMISSIONS['iam.key.read']]), async (req, res, next) => {
    try {
        res.send({
            key: await KeyDAO.findByTenant(
                req.params.id,
            ),
        });
    } catch (err) {
        next(err);
    }
});

router.delete('/:id/key/', auth.can([RESTRICTED_PERMISSIONS['iam.key.delete']]), async (req, res, next) => {
    try {
        await KeyDAO.deleteByTenant(req.params.id);
        res.sendStatus(200);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
