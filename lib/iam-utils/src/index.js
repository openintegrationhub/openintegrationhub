const Logger = require('@basaas/node-logger');
const rp = require('request-promise');
const base64url = require('base64url');
const NodeCache = require('node-cache');

const log = Logger.getLogger('iam-middleware');
const CONF = require('./conf');
const CONSTANTS = require('./constants');
const Client = require('./client');
const PERMISSIONS = require('./permissions');

let tokenCache;

if (CONF.tokenCacheTTL) {
    tokenCache = new NodeCache({ stdTTL: parseInt(CONF.tokenCacheTTL, 10) });
}

log.info(
    'iam-middleware config',
    Object.assign(
        {},
        { ...CONF },
        {
            iamToken: CONF.iamToken.replace(/.(?=.{4,}$)/g, '*'),
            oidcServiceClientSecret: CONF.oidcServiceClientSecret.replace(/.(?=.{4,}$)/g, '*'),
        },
    ),
);

const allRequiredElemsExistsInArray = (array = [], requiredElems) => {
    let hit = 0;

    for (let i = 0; i < requiredElems.length; i += 1) {
        if (array.indexOf(requiredElems[i]) >= 0) {
            hit += 1;
        }
    }

    return hit === requiredElems.length;
};

const isAdmin = user => allRequiredElemsExistsInArray(user.permissions, CONSTANTS.DEFAULT_PERMISSIONS.ADMIN);

const isTenantAdmin = user => allRequiredElemsExistsInArray(user.permissions, CONSTANTS.DEFAULT_PERMISSIONS.TENANT_ADMIN);

const areAllCommonPermissions = (permissions) => {
    const restrictedHit = permissions.find(permission => !PERMISSIONS.common[permission]);
    return !restrictedHit;
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

            if (introspectEndpoint === CONF.introspectEndpointOidc && body.active === false) {
                return {
                    error: 'Token expired',
                };
            }

            const user = {
                ...body,
                ...body.claims,
            };

            if (user.memberships) {
                user.currentContext = user.memberships.find(membership => membership.active);
            } else {
                /* @deprecated */
                log.warn('currentContext is deprecated. Rely on user.tenant instead.');
                user.currentContext = {
                    roles: user.roles || [],
                    tenant: user.tenant || null,
                    permissions: user.permissions || [],
                };
            }
            user.permissions = user.permissions || [];
            user.isAdmin = isAdmin(user);
            user.isTenantAdmin = isTenantAdmin(user);

            user.sub = user.sub || body._id;
            /* @deprecated */
            user.tenantId = body.tenantId;

            if (tokenCache) {
                log.debug('iam.getUserData.setCache');
                tokenCache.set(token, user);
            }
            Object.freeze(user);

            return user;
        } catch (err) {
            log.error(err);

            log.debug('iam.getUserData.Error', {
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
            if (tokenCache) {
                log.debug('iam.middleware.fetchFromCache');
                payload = tokenCache.get(token);
            }
            payload = payload || await module.exports.getUserData({ token, introspectType: req.headers['x-auth-type'] });
            if (payload.error) {
                return next({ status: 401, message: `Token invalid. Error: ${payload.error}.` });
            }
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
            log.error('Payload is empty or undefined', { payload });
            return next({ status: 400, message: 'Payload is either empty or undefined' });
        }
    },

    // @todo: don't duplicate code
    async koaMiddleware(ctx, next) {
        let payload = null;
        let token = null;
        if (!ctx.headers.authorization) {
            return ctx.throw(401, 'Missing authorization header.');
        }

        try {
            const header = ctx.headers.authorization.split(' ');
            if (!header || header.length < 2) {
                log.debug('Authorization header length is incorrect');
                return ctx.throw(401, 'Invalid authorization header');
            }
            token = header[1];
            if (tokenCache) {
                log.debug('iam.middleware.fetchFromCache');
                payload = tokenCache.get(token);
            }
            payload = payload || await module.exports.getUserData({ token, introspectType: ctx.headers['x-auth-type'] });
            if (payload.error) {
                return ctx.throw(401, `Token invalid. Error: ${payload.error}.`);
            }
        } catch (err) {
            log.debug('Failed to parse token', err);
            return ctx.throw(401, `Token invalid. Error: ${err.name}. Details: ${err.message}`);
        }

        if (payload) {
            ctx.state.user = payload;
            return next();
        } else {
            log.error('Payload is empty or undefined', { payload });
            return ctx.throw(400, 'Payload is either empty or undefined');
        }
    },

    hasAll: ({ user, requiredPermissions }) => {
        if (!Array.isArray(requiredPermissions)) {
            requiredPermissions = [requiredPermissions];
        }

        const { permissions } = user;

        /** requester is either admin, or a service account with correct permissions
         or a user in context of a tenant with her permissions
         */
        if (
            isAdmin(user)
            || (isTenantAdmin(user) && areAllCommonPermissions(requiredPermissions))
            || allRequiredElemsExistsInArray(permissions, requiredPermissions)
        ) {
            return true;
        }

        return false;
    },

    hasOneOf: ({ user, requiredPermissions }) => {
        if (!Array.isArray(requiredPermissions)) {
            requiredPermissions = [requiredPermissions];
        }

        const permissions = user.permissions || [];

        /** requester is either admin, or a service account with correct permissions
         or a user in context of a tenant with her permissions
         */
        if (isAdmin(user) || requiredPermissions.find(reqPerm => permissions.find(userPerm => userPerm === reqPerm))) {
            return true;
        }

        return false;
    },

    /**
     * @param {Array} requiredPermissions
     * */
    can: requiredPermissions => async (req, res, next) => {
        const userHasPermissions = module.exports.hasAll({
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

    hasPermission: (user, permission) => user.permissions.indexOf(permission) >= 0,

    isOwnerOf({ entity, user, allTenantUsers=false }) {

        const userTenant = user.tenant && user.tenant.toString();
        const entityTenant = entity.tenant && entity.tenant.toString();

        const userIsOwner = entity.owners && !!entity.owners.find(
            elem => elem.id === user.sub && elem.type === CONSTANTS.ENTITY.USER,
        );

        const tenantIsOwner = (entityTenant === userTenant) || (entity.owners && !!entity.owners.find(
            elem => elem.id === userTenant && elem.type === CONSTANTS.ENTITY.TENANT,
        ));

        return userIsOwner || (tenantIsOwner && (isTenantAdmin(user) || allTenantUsers));
    },

    createClient({ baseUrl, iamToken }) {
        return new Client({
            baseUrl: baseUrl || CONF.apiBase,
            iamToken: iamToken || CONF.iamToken,
        });
    },

    Client,

    PERMISSIONS,

    isAdmin,
    isTenantAdmin
};
