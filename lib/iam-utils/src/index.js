const Logger = require('@basaas/node-logger');
const rp = require('request-promise');
const base64url = require('base64url');

const log = Logger.getLogger('iam-middleware');
const CONF = require('./conf');
const CONSTANTS = require('./constants');

const maskString = (str) => {

    const regex = str.length < 10 ? /./g : /.(?=.{4,}$)/g;

    return str.replace(regex, '*');

};

log.info(
    'iam-middleware config',
    Object.assign(
        {},
        { ...CONF },
        {
            iamToken: maskString(CONF.iamToken),
            oidcServiceClientSecret: maskString(CONF.oidcServiceClientSecret),
        }
    )
);

const allRequiredElemsExistsInArray = (array, requiredElems) => {
    let hit = 0;

    for (let i = 0; i < requiredElems.length; i += 1) {
        if (array.indexOf(requiredElems[i]) >= 0) {
            hit += 1;
        }
    }

    return hit === requiredElems.length;
};

module.exports = {

    getUserData: async ({ token, introspectType }) => {

        introspectType = introspectType || CONF.introspectType;
        const introspectEndpoint = introspectType.toLowerCase() === CONSTANTS.AUTH_TYPES.basic ? CONF.introspectEndpointBasic : CONF.introspectEndpointOidc;

        try {
            const body = await rp.post({
                uri: introspectEndpoint,
                headers: introspectType.toLowerCase() === CONSTANTS.AUTH_TYPES.oidc ? {
                    authorization: `Basic ${base64url(`${
                        encodeURIComponent(CONF.oidcServiceClientId)}:${encodeURIComponent(CONF.oidcServiceClientSecret)}`)
                    }`,
                } : {
                    'x-auth-type': CONSTANTS.AUTH_TYPES.basic,
                    authorization: `Bearer ${CONF.iamToken}`,
                },
                ...(introspectType.toLowerCase() === CONSTANTS.AUTH_TYPES.oidc ? {
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

            const user = {
                ...body,
                ...body.claims,
            };

            user.sub = user.sub || body._id;

            return user;
        } catch (err) {
            log.error(err);

            log.debug('getUserData.Error', {
                introspectType, token, iam_token: CONF.iamToken, msg: err.message,
            });

            if (err.statusCode === 404) {
                log.error('Token not found in IAM', { introspectType, token });
                throw new Error('Token not found in IAM');
            }

            throw new Error('Authorization failed');
        }
    },

    middleware: async (req, res, next) => {

        let payload = null;
        let token = null;
        if (!req.headers.authorization) {
            return next({ status: 401, message: 'Missing authorization header.' });
        }

        try {
            const header = req.headers.authorization.split(' ');
            if (!header || header.length < 2) {
                log.debug('Authorization header length is incorrect');
                return next({ status: 401, message: 'Invalid authorization header' });
            }
            token = header[1];
            payload = await module.exports.getUserData({ token, introspectType: req.headers['x-auth-type'] });
        } catch (err) {
            log.debug('Failed to parse token', err);
            return next({ status: 401, message: `Token invalid. Error: ${err.name}. Details: ${err.message}` });
        }

        if (payload) {
            req.user = payload;
            /* @deprecated */
            req.__HEIMDAL__ = req.user;
            return next();
        } else {
            log.error('JWT payload is empty or undefined', { payload });
            return next({ status: 400, message: 'JWT payload is either empty or undefined' });
        }
    },

    hasAll: ({ user, requiredPermissions }) => {
        if (!Array.isArray(requiredPermissions)) {
            requiredPermissions = [requiredPermissions];
        }

        const { role, permissions, currentContext } = user;

        /** requester is either admin, or a service account with correct permissions
         or a user in context of a tenant with her permissions
         */
        if (role === CONSTANTS.ROLES.ADMIN
            || (role === CONSTANTS.ROLES.SERVICE_ACCOUNT
                && permissions.length
                && allRequiredElemsExistsInArray(permissions, requiredPermissions)
            )
            || (
                currentContext && currentContext.permissions.length
                && allRequiredElemsExistsInArray(currentContext.permissions, requiredPermissions)
            )
        ) {
            return true;
        }

        return false;
    },

    hasOneOf: ({ user, requiredPermissions }) => {
        if (!Array.isArray(requiredPermissions)) {
            requiredPermissions = [requiredPermissions];
        }

        const { role, permissions, currentContext } = user;

        /** requester is either admin, or a service account with correct permissions
         or a user in context of a tenant with her permissions
         */
        if (role === CONSTANTS.ROLES.ADMIN
            || (role === CONSTANTS.ROLES.SERVICE_ACCOUNT
                && permissions.length
                && requiredPermissions.find(reqPerm => permissions.find(userPerm => userPerm === reqPerm))
            )
            || (
                currentContext && currentContext.permissions.length
                && requiredPermissions.find(reqPerm => currentContext.permissions.find(userPerm => userPerm === reqPerm))
            )
        ) {
            return true;
        }

        return false;
    },

    /**
     * @param {Array} requiredPermissions
     * */
    can: requiredPermissions => async (req, res, next) => {
        const userHasPermissions = module.exports.hasPermissions({
            requiredPermissions,
            user: req.user,
        });

        if (userHasPermissions) {
            return next();
        }
        return next({
            status: 403,
            message: CONSTANTS.ERROR_CODES.MISSING_PERMISSION,
            details: JSON.stringify(requiredPermissions),
        });
    },

};
