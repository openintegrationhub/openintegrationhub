const jwt = require('jsonwebtoken');
const logger = require('@basaas/node-logger');
const { verify } = require('@openintegrationhub/iam-utils');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.logging.namespace}/auth`);
const { ROLE } = require('../../constant');
const SecretsDAO = require('../../dao/secret');

function extractToken(req) {
    const header = req.headers.authorization.split(' ');
    return header[1];
}

async function verifyToken(req) {
    if (process.env.NODE_ENV === 'test') {
        return jwt.decode(extractToken(req));
    }
    // introspect token

    return await verify(extractToken(req));
}

async function verifyRole(validRoles, req, res, next) {
    try {
        req.user = await verifyToken(req);
        if (validRoles.indexOf(req.user.role) !== -1) {
            next();
        } else {
            next({ status: 401 });
        }
    } catch (err) {
        log.error(err);
        next({ status: 401 });
    }
}

async function userIsOwnerOfSecret(req, res, next) {
    try {
        const doc = await SecretsDAO.findOne({
            _id: req.params.id,
            'owner.entityId': req.user.sub,
        });

        if (!doc) {
            return next({ status: 404 });
        }

        const userIsOwner = doc.owner.find(elem => elem.entityId === req.user.sub);

        if (userIsOwner) {
            return next();
        }
        return next({ status: 403 });
    } catch (err) {
        log.error(err);
        next({ status: 401 });
    }
}

module.exports = {
    isLoggedIn: async (req, res, next) => {
        try {
            req.user = await verifyToken(req);
            next();
        } catch (err) {
            log.error(err);
            next({ status: 401 });
        }
    },
    isUser: async (req, res, next) => {
        await verifyRole([ROLE.ADMIN, ROLE.USER], req, res, next);
    },
    isAdmin: async (req, res, next) => {
        await verifyRole([ROLE.ADMIN], req, res, next);
    },
    userIsOwnerOfSecret,
};
