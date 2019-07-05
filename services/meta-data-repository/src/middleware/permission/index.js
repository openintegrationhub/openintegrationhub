const logger = require('@basaas/node-logger');
const { isOwnerOf, hasAll } = require('@openintegrationhub/iam-utils');
const DomainDAO = require('../../dao/domain');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.logging.namespace}/permission`);
module.exports = {
    domainOwnerOrAllowed: ({ permissions }) => async (req, res, next) => {
        try {
            req.hasAll = hasAll({
                user: req.user,
                requiredPermissions: permissions,
            });

            req.ownedDomain = await isOwnerOf({
                dao: DomainDAO,
                sub: req.user.sub,
                id: req.params.id || req.domainId,
            });

            if (req.hasAll) {
                if (req.ownedDomain !== null) {
                    return next();
                }
                return next({ status: 404 });
            }

            if (req.ownedDomain === null) return next({ status: 404 });
            if (req.ownedDomain === false) return next({ status: 403 });

            return next();
        } catch (err) {
            log.error(err);
            if (req.hasAll) {
                return next({ status: 404 });
            }

            return next({ status: 403 });
        }
    },
};
