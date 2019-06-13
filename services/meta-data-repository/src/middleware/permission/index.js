const logger = require('@basaas/node-logger');
const { isOwnerOf, hasAll } = require('@openintegrationhub/iam-utils');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.logging.namespace}/permission`);
module.exports = {
    ownerOrAllowed: ({ dao, permissions }) => async (req, res, next) => {
        try {
            req.hasAll = hasAll({
                user: req.user,
                requiredPermissions: permissions,
            });

            req.isOwnerOf = await isOwnerOf({
                dao,
                sub: req.user.sub,
                id: req.params.id,
            });

            if (req.hasAll || req.isOwnerOf) {
                return next();
            }

            return next({ status: 403 });
        } catch (err) {
            log.error(err);
            return next({ status: 401 });
        }
    },
};
