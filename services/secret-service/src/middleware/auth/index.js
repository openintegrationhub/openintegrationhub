const rp = require('request-promise');
const logger = require('@basaas/node-logger');
const base64url = require('base64url');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.logging.namespace}/auth`);
const SecretDAO = require('../../dao/secret');
const AuthClientDAO = require('../../dao/auth-client');

function extractToken(req) {
    const header = req.headers.authorization.split(' ');
    return header[1];
}

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

        const introspectType = req.headers['x-auth-type'] || conf.iam.introspectType;
        const introspectEndpoint = introspectType === 'basic' ? conf.iam.introspectEndpointBasic : conf.iam.introspectEndpoint;

        try {
            const body = await rp.post({
                uri: introspectEndpoint,
                headers: introspectType === 'OIDC' ? {
                    authorization: `Basic ${base64url(`${
                        encodeURIComponent(conf.iam.oidcServiceClientId)}:${encodeURIComponent(conf.iam.oidcServiceClientSecret)}`)
                    }`,
                } : {
                    'x-auth-type': 'basic',
                    authorization: `Bearer ${conf.iam.token}`,
                },
                ...(introspectType === 'OIDC' ? {
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

            req.user = {};
            req.user.sub = req.user.sub || body._id;

            req.user = {
                ...body,
                ...body.claims,
            };

            return next();
        } catch (err) {
            log.error(err);

            log.debug('getuserData.Error', {
                introspectType, token, iam_token: conf.iam.token, msg: err.message,
            });

            if (err.statusCode === 404) {
                log.error('Token not found in IAM', { introspectType, token });
                return next({
                    status: 401,
                    message: 'Token not found in IAM',
                });
            }

            return next({
                status: 401,
                message: err.message,
            });
        }
    },
    async userIsOwnerOfSecret(req, res, next) {
        await userIsOwnerOf(SecretDAO, req, res, next);
    },

    async userIsOwnerOfAuthClient(req, res, next) {
        await userIsOwnerOf(AuthClientDAO, req, res, next);
    },

};
