const WorkflowDAO = require('../dao/workflows');
const PERMISSIONS = require('../constant/permission');
const { hasPermission, isAdmin } = require('@openintegrationhub/iam-utils');

const userHasWriteAccess = async (req, res, next) => {
    const entityId = req.params.id;

    const entity = await WorkflowDAO.findOne({
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
        if (entity.owner === req.user._id) {
            return next();
        }
        if (!hasPermission(req.user, PERMISSIONS.common.manageWorkflows)) {
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

    const entity = await WorkflowDAO.findOne({
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
