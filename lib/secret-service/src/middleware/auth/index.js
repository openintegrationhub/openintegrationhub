const logger = require('@basaas/node-logger');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.log.namespace}/auth`);
const SecretDAO = require('../../dao/secret');
const AuthClientDAO = require('../../dao/auth-client');

async function userIsOwnerOf(dao, req, res, next) {
    // TODO check for type as well
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
        err.__errName = 'userIsOwnerOf';
        log.error(err);
        next({ status: 401 });
    }
}

module.exports = {
    async userIsOwnerOfSecret(req, res, next) {
        await userIsOwnerOf(SecretDAO, req, res, next);
    },

    async userIsOwnerOfAuthClient(req, res, next) {
        await userIsOwnerOf(AuthClientDAO, req, res, next);
    },

};
