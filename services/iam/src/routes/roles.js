const express = require('express');
const Logger = require('@basaas/node-logger');

const router = express.Router();

const CONF = require('../conf');
const CONSTANTS = require('../constants');
const auth = require('../util/auth');
const CommonUtils = require('../util/common');
const RolesDAO = require('../dao/roles');
const { PERMISSIONS, permissionsAreCommon, roleNameIsRestricted } = require('../access-control/permissions');

const logger = Logger.getLogger(`${CONF.general.loggingNameSpace}/role`, {
    level: 'debug',
});

router.use(auth.hasTenantPermissions([PERMISSIONS['tenant.roles.read']]));

/**
 * Get all roles
 */
router.get('/', async (req, res, next) => {

    const defaultRoles = {
        isGlobal: true,
    };
    let query = {
        isGlobal: false,
    };

    if (!req.user.isAdmin) {
        defaultRoles.type = CONSTANTS.ROLE_TYPE.TENANT;
    }

    if (req.user.tenant) {
        query = {
            tenant: req.user.tenant,
        };
    }

    try {
        const standardRoles = await RolesDAO.find(defaultRoles);
        const docs = await RolesDAO.find(query);
        return res.send(standardRoles.concat(docs));
    } catch (err) {
        logger.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

const userIsOwnerOfResource = async (req, res, next) => {

    if (req.user.isAdmin) {
        return next();
    }

    const doc = await RolesDAO.findOne({
        _id: req.params.id,
        // tenant: req.user.currentContext.tenant,
    });

    if (doc) {
        if (doc.tenant.toString() === req.user.tenant.toString()) {
            return next();
        } else {
            return next({ status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN });
        }

    } else {
        return next({ status: 404, message: CONSTANTS.ERROR_CODES.FORBIDDEN });
    }

};

/**
 * Get role by id
 */
router.get('/:id', userIsOwnerOfResource, async (req, res, next) => {
    try {
        const docs = await RolesDAO.findOne({
            tenant: req.user.tenant,
            _id: req.params.id,
        });
        if (docs) {
            if (req.query.meta) {
                return res.send({ data: docs, meta: { total: docs.length } });
            }
            return res.send(docs);
        }
        return res.sendStatus(404);
    } catch (err) {
        logger.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

/**
 * Create a new role
 * */
router.post('/', auth.hasTenantPermissions([PERMISSIONS['tenant.roles.create']]), async (req, res, next) => {

    const {
        name,
        description = '',
        permissions = [],
    } = req.body;
    let { isGlobal } = req.body;

    if (!name || typeof permissions !== 'object') {
        return next({ status: 400, message: CONSTANTS.ERROR_CODES.INPUT_INVALID });
    }

    if (isGlobal && !req.user.isAdmin) {
        isGlobal = false;
    }

    /* eslint-disable-next-line no-restricted-syntax  */
    if (!permissionsAreCommon(permissions)) {
        // TODO this should probably generate an audit log event
        logger.warn(`An attempt to assign a restricted permission to a role by user ${req.user.userid}`);
        return next({
            status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN, details: 'Restricted permission used',
        });
    }

    if (roleNameIsRestricted(name)) {
        return next({
            status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN, details: 'Restricted role name',
        });
    }

    try {
        const newRole = await RolesDAO.create({
            name,
            permissions,
            description,
            isGlobal,
            tenant: req.user.tenant,
        });

        res.status(200).send(newRole);
    } catch (err) {
        logger.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }

});

/**
 * Update role
 * */
router.patch('/:id', auth.hasTenantPermissions([PERMISSIONS['tenant.roles.update']]), userIsOwnerOfResource, async (req, res, next) => {

    const {
        name,
        description,
        permissions,
    } = req.body;

    /* eslint-disable-next-line no-restricted-syntax  */
    if (permissions && !permissionsAreCommon(permissions)) {
        logger.warn(`An attempt to assign an uncommon permission to a role by user ${req.user.userid}`);
        return next({
            status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN, details: 'Restricted permission used',
        });
    }

    if (name && roleNameIsRestricted(name)) {
        return next({
            status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN, details: 'Restricted role name',
        });
    }

    try {
        const updatedRole = await RolesDAO.update({
            id: req.params.id,
            props: CommonUtils.removeEmptyProps({
                name,
                permissions,
                description,
            }),
        });

        res.status(200).send(updatedRole);
    } catch (err) {
        logger.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }

});

/**
 * Delete a tenant role
 */
router.delete('/:id', auth.hasTenantPermissions([PERMISSIONS['tenant.roles.delete']]), userIsOwnerOfResource, async (req, res, next) => {
    try {
        await RolesDAO.delete({ id: req.params.id, tenant: req.user.tenant });
        return res.sendStatus(200);
    } catch (err) {
        logger.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

module.exports = router;
