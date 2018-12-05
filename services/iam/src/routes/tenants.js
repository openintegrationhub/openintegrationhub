const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const jsonParser = bodyParser.json();
const Logger = require('@basaas/node-logger');
const conf = require('./../conf');
const auth = require('./../util/auth');
const TenantDAO = require('./../dao/tenants');
const UserDAO = require('./../dao/users');

const log = Logger.getLogger(`${conf.general.loggingNameSpace}/user`, {
    level: 'debug',
});

router.use(auth.validateAuthentication);

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
router.post('/', auth.isAdmin, jsonParser, async (req, res, next) => {
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
router.get('/:id', auth.isTenantAdmin, async (req, res, next) => {
    const tenantID = req.params.id;
    try {
        const doc = await TenantDAO.find({ _id: tenantID });
        return res.send(doc && doc[0]);
    } catch (err) {
        return next(err);
    }
});

/**
 * Modify tenant entirely
 * */
router.put('/:id', auth.isTenantAdmin, jsonParser, async (req, res, next) => {
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
router.patch('/:id', auth.isTenantAdmin, jsonParser, async (req, res, next) => {
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
router.delete('/:id', auth.isAdmin, async (req, res, next) => {

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

/**
 * Assign given user to the tenant
 */
router.post('/:id/users', auth.isTenantAdmin, jsonParser, async (req, res, next) => {
    const reqBody = req.body;
    const tenantID = req.params.id;

    if (!reqBody.role || !reqBody.user) {
        return next({ status: 400, message: 'Missing role or user id' });
    }

    try {
        const doc = await UserDAO.assignUserToTenantWithRole({
            tenantId: tenantID,
            role: reqBody.role,
            userId: reqBody.user,
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
router.delete('/:id/user/:userId', auth.isTenantAdmin, jsonParser, async (req, res, next) => {
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
module.exports = router;
