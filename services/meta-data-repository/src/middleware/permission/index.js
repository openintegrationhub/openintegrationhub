const logger = require('@basaas/node-logger');
const { hasAll, isOwnerOf } = require('@openintegrationhub/iam-utils');
const DomainDAO = require('../../dao/domain');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.logging.namespace}/permission`);

function isOwnerOf1({ entity, user }) {
    const userIsOwner = !!entity.owners.find(
        elem => elem.id === user.sub,
    );

    const tenantIsOwner = !!entity.owners.find(
        elem => elem.id === user.tenantId,
    );
    console.log(tenantIsOwner);

    return (
        (user.role === 'TENANT_ADMIN' && tenantIsOwner)
        || userIsOwner
    );
}

module.exports = {
    domainOwnerOrAllowed: ({ permissions }) => async (req, res, next) => {
        try {
            req.hasAll = hasAll({
                user: req.user,
                requiredPermissions: permissions,
            });

            console.log(req.user);

            const domain = await DomainDAO.findOne({
                _id: req.params.id || req.domainId,
            });

            if (!domain) {
                if (req.hasAll) {
                    return next({ status: 404 });
                }
                return next({ status: 403 });
            }

            req.ownsDomain = isOwnerOf1({
                entity: domain,
                user: req.user,
            });

            if (req.ownsDomain || req.hasAll) {
                return next();
            }

            return next({ status: 403 });
        } catch (err) {
            log.error(err);
            if (req.hasAll) {
                return next({ status: 404 });
            }

            return next({ status: 403 });
        }
    },
};
