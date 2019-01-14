const rp = require('request-promise');
const logger = require('@basaas/node-logger');
const base64url = require('base64url');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.logging.namespace}/auth`);
const SecretsDAO = require('../../dao/secret');
const AuthClientDAO = require('../../dao/auth-client');

function extractToken(req) {
    const header = req.headers.authorization.split(' ');
    return header[1];
}

async function userIsOwnerOf(dao, req, res, next) {
    // TODO check for entityType as well

    try {
        const doc = await dao.findOne({
            _id: req.params.id,
        });

        if (!doc) {
            return next({ status: 404 });
        }

        const userIsOwner = doc.owners.find(
            elem => elem.entityId === req.user.sub,
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
    async getUserData(req, res, next) {
        let token;

        try {
            token = extractToken(req);
        } catch (err) {
            return next({
                status: 401,
                message: 'Could not parse token',
            });
        }
        try {
            const body = await rp.post({
                uri: conf.iam.introspectEndpoint,
                headers: conf.iam.introspectType === 'OIDC' ? {
                    authorization: `Basic ${base64url(`${
                        encodeURIComponent(conf.iam.oidcServiceClientId)}:${encodeURIComponent(conf.iam.oidcServiceClientId)}`)
                    }`,
                } : {
                    'x-auth-type': 'basic',
                    authorization: `Bearer ${conf.iam.token}`,
                },
                ...(conf.iam.introspectType === 'OIDC' ? {
                    form: {
                        token,
                    },
                } : {
                    body: {
                        token,
                    },
                }),
                json: true,
            });

            req.user = body;
            req.user.sub = req.user.sub || body._id;
            return next();
        } catch (err) {
            log.error(err);
            return next({
                status: 500,
            });
        }
    },
    async userIsOwnerOfSecret(req, res, next) {
        await userIsOwnerOf(SecretsDAO, req, res, next);
    },

    async userIsOwnerOfAuthClient(req, res, next) {
        await userIsOwnerOf(AuthClientDAO, req, res, next);
    },

};
