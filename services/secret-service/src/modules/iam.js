const iamLib = require('@openintegrationhub/iam-utils');

const logger = require('@basaas/node-logger');
const conf = require('../conf');
const { ENTITY_TYPE } = require('../constant');

const log = logger.getLogger(`${conf.log.namespace}/auth`);
const SecretDAO = require('../dao/secret');
const AuthClientDAO = require('../dao/auth-client');

async function userIsOwnerOf(dao, req, res, next) {
    try {
        const doc = await dao.findOne({
            _id: req.params.id,
        });

        if (!doc) {
            return next({ status: 404 });
        }

        /**
         * Define custom checks, e.g. to support workspaces as owners:
         *
         * elem => req.user.workspaces.indexOf(elem.id) >= 0 ,
         *
         * */
        const userIsOwner = doc.owners.find(
            (elem) => elem.id === req.user.sub || (elem.id === req.user.tenant && elem.type === ENTITY_TYPE.TENANT),
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

    get middleware() {
        return iamLib.middleware;
    },

    hasOneOf: iamLib.hasOneOf,
    can: iamLib.can,
    hasAll: iamLib.hasAll,

    async userIsOwnerOfSecret(req, res, next) {
        await userIsOwnerOf(SecretDAO, req, res, next);
    },

    async userIsOwnerOfAuthClient(req, res, next) {
        await userIsOwnerOf(AuthClientDAO, req, res, next);
    },

};
