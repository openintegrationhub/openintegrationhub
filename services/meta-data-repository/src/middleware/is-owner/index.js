const logger = require('@basaas/node-logger');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.logging.namespace}/is-owner`);
const DomainDAO = require('../../dao/domain');

async function isOwnerOf(dao, req, res, next) {
    try {
        const doc = await dao.findOne({
            _id: req.params.id,
        });

        if (!doc) {
            return next({ status: 404 });
        }
        const userIsOwner = doc.owners.find(
            elem => elem.id === req.user.sub,
        );

        if (userIsOwner) {
            req.obj = doc;
            return next();
        }
        return next({ status: 403 });
    } catch (err) {
        log.error(err);
        next({ status: 401 });
    }
}

module.exports = {
    async isOwnerOfDomain(req, res, next) {
        await isOwnerOf(DomainDAO, req, res, next);
    },

};
