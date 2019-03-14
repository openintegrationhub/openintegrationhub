const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const Logger = require('@basaas/node-logger');
const conf = require('./../conf');
const CONSTANTS = require('./../constants');
const auth = require('./../util/auth');
const TenantDAO = require('./../dao/tenants');
const UserDAO = require('../dao/accounts');
const RolesDAO = require('../dao/roles');
const KeyDAO = require('../dao/keys');
const { permissionsAreCommon, PERMISSIONS, RESTRICTED_PERMISSIONS } = require('./../access-control/permissions');

const log = Logger.getLogger(`${conf.general.loggingNameSpace}/user`, {
    level: 'debug',
});

/**
 * Get all Tenants
 */
router.get('/', auth.isAdmin, async (req, res, next) => {
    try {
        const doc = await TenantDAO.find({});
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
router.get('/:id/profile', auth.hasContext, auth.hasTenantPermissions([PERMISSIONS['tenant.profile.read']]), async (req, res, next) => {
    const tenantID = req.params.id;
    try {
        const doc = await TenantDAO.findOne({ _id: tenantID });
        return res.send(doc);
    } catch (err) {
        return next(err);
    }
});

/**
 * Get a specific tenant by id
 */
router.get('/:id', auth.isTenantAdmin, async (req, res, next) => {
    const tenantID = req.params.id;
    try {
        const doc = await TenantDAO.findOne({ _id: tenantID });
        return res.send(doc);
    } catch (err) {
        return next(err);
    }
});

/**
 * Modify tenant entirely
 * */
router.put('/:id', auth.isTenantAdmin, async (req, res, next) => {
    const props = req.body;
    try {
        await TenantDAO.update({ id: req.params.id, props, partialUpdate: false });
    
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
router.patch('/:id', auth.isTenantAdmin, async (req, res, next) => {
    const props = req.body;
    try {
        await TenantDAO.update({ id: req.params.id, props, partialUpdate: true });

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
 * Get all Users for Tenant
 */
router.get('/:id/users', auth.isTenantAdmin, async (req, res, next) => {
    try {
        const doc = await UserDAO.getUsersAssignedToTenant({ tenantId: req.params.id });
        log.debug(doc);
        return res.send(doc);
    } catch (err) {
        return next(err);
    }
});

const roleBelongsToTenant = async ({ role, tenant }) => RolesDAO.findOne({
    role,
    tenant,
}).lean();

/**
 * Assign given user to the tenant
 */
router.post('/:id/users', auth.isTenantAdmin, async (req, res, next) => {

    // TODO: switch to tenant context
    const reqBody = req.body;
    const tenantID = req.params.id;

    if (!reqBody.user) {
        return next({ status: 400, message: 'Missing user id' });
    }

    // if (await !roleBelongsToTenant({ role: reqBody.role, tenant: tenantID })) {
    //     return next({ status: 400, message: `Role ${reqBody.role} does not belong to tenant ${tenantID}.` });
    // }

    if (reqBody.permissions && !permissionsAreCommon(reqBody.permissions)) {
        log.warn(`An attempt to assign a restricted permission to user ${req.user.userid}`);
        return next({
            status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN, details: 'Restricted permission used',
        });
    }

    try {
        const doc = await UserDAO.assignUserToTenantWithRole({
            tenantId: tenantID,
            roles: reqBody.roles,
            userId: reqBody.user,
            permissions: reqBody.permissions || [],
        });
        return res.send(doc);
    } catch (err) {
        log.error(err);
        return next(err);
    }
});

/**
 * Remove the user from tenant
 */
router.delete('/:id/user/:userId', auth.isTenantAdmin, async (req, res, next) => {
    try {
        const doc = await UserDAO.removeUserFromTenant({
            tenantId: req.params.id, 
            userId: req.params.userId,
        });
        res.send(doc);
    } catch (err) {
        next(err);
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
