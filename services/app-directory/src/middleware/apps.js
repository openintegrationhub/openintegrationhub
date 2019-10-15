const AppDAO = require('../dao/apps');
const PERMISSIONS = require('../constant/permission');
const { hasPermission, isAdmin } = require('@openintegrationhub/iam-utils');

const userHasWriteAccess = async (req, res, next) => {

    const entityId = req.params.id;

    const entity = await AppDAO.findOne({
        _id: entityId,
    });

    if (!entity) {
        return next({
            status: 404,
        });
    }

    if (isAdmin(req.user)) {
        return next();
    }

    if (entity.tenant === req.user.tenant) {
        if (!hasPermission(req.user, PERMISSIONS.common.manageApps)) {
            return next({
                status: 403,
            });
        }
    }

    return next({
        status: 403,
    });
};

const userHasReadAccess = async (req, res, next) => {
    const entityId = req.params.id;

    const entity = await AppDAO.findOne({
        _id: entityId,
    });

    if (!entity) {
        return next({
            status: 404,
        });
    }

    if (entity.tenant === req.user.tenant) {
        return next();
    }

    return next({
        status: 403,
    });
};

module.exports = {
    userHasReadAccess,
    userHasWriteAccess,
};
