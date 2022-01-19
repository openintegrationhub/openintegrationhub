const Logger = require('@basaas/node-logger');
const passport = require('passport');
const rp = require('request-promise');
const { Event, EventBusManager } = require('@openintegrationhub/event-bus');
const TokenUtils = require('./tokens');

const Account = require('../models/account');

const basic = require('../oidc/helper/basic-auth-header');
const CONSTANTS = require('../constants');
const conf = require('../conf');
const { PERMISSIONS, RESTRICTED_PERMISSIONS } = require('../access-control/permissions');

const { oidc } = conf;

const log = Logger.getLogger(`${conf.general.loggingNameSpace}/auth`, {
    level: 'debug',
});

const removeEmptyProps = (obj) => {
    /* eslint-disable-next-line no-restricted-syntax */
    for (const key in obj) {
        if (obj.hasOwnProperty(key) && obj[key] === undefined) {
            delete obj[key];
        }
    }
    return obj;
};

const isAdminRole = (user) => user.isAdmin;

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

    hasPermissions: ({ user, requiredPermissions }) => {

        if (!Array.isArray(requiredPermissions)) {
            requiredPermissions = [requiredPermissions];
        }

        const { roles, permissions, tenant } = user;
        /* requester is either admin, or a service account with correct permissions or a user in context of a tenant with her permissions */

        if (permissions.find((permission) => permission === RESTRICTED_PERMISSIONS.all)) {
            return true;
        }

        if (allRequiredElemsExistsInArray(permissions, requiredPermissions)) {
            return true;
        }

        return false;
    },

    /**
     * @param {Array} requiredPermissions
     * */
    can: (requiredPermissions) => async (req, res, next) => {
        const userHasPermissions = module.exports.hasPermissions({
            requiredPermissions,
            user: req.user,
        });

        if (userHasPermissions) {
            return next();
        } else {
            return next({
                status: 403,
                message: CONSTANTS.ERROR_CODES.MISSING_PERMISSION,
                details: JSON.stringify(requiredPermissions),
            });
        }
    },

    /**
     * @param {Array} requiredPermissions
     * */
    hasTenantPermissions: (requiredPermissions) => async (req, res, next) => {

        if (req.user.permissions.find((perm) => perm === PERMISSIONS['tenant.all'])) {
            return next();
        }

        const userHasPermissions = module.exports.hasPermissions({
            requiredPermissions,
            user: req.user,
        });

        if (userHasPermissions) {
            return next();
        } else {
            return next({
                status: 403,
                message: CONSTANTS.ERROR_CODES.MISSING_PERMISSION,
                details: JSON.stringify(requiredPermissions),
            });
        }
    },

    accountIsEnabled(req, res, next) {
        if (req.user && req.user.status === CONSTANTS.STATUS.ACTIVE) {
            return next();
        } else {
            req.logout();
            return next({ status: 401, message: CONSTANTS.ERROR_CODES.ENTITY_DISABLED });
        }
    },

    authenticate: (req, res, next) => {
        passport.authenticate('local', async (err, user, passportErrorMsg) => {

            if (err) {
                return next(err);
            }

            if (passportErrorMsg) {
                if (passportErrorMsg.name === 'IncorrectPasswordError') {
                    await Account.updateOne({
                        username: req.body.username,
                    }, {
                        $inc: {
                            'safeguard.failedLoginAttempts': 1,
                        },
                    }, {
                        timestamps: false, 
                    });
                    return next({ status: 401, message: CONSTANTS.ERROR_CODES.PASSWORD_INCORRECT });
                }
                if (passportErrorMsg.name === 'IncorrectUsernameError') {
                    return next({ status: 401, message: CONSTANTS.ERROR_CODES.USER_NOT_FOUND });
                }
                if (req.body.username) {
                    const event = new Event({
                        headers: {
                            name: 'iam.user.loginFailed',
                        },
                        payload: { user: req.body.username.toString() },
                    });
                    EventBusManager.getEventBus().publish(event);
                }
            }
            if (!user) {
                return next({ status: 401, message: CONSTANTS.ERROR_CODES.DEFAULT });
            }

            req.logIn(user, async (err) => {
                if (err) {
                    log.error('Failed to login user', err);
                    const event = new Event({
                        headers: {
                            name: 'iam.user.loginFailed',
                        },
                        payload: { user: req.body.username.toString() },
                    });
                    EventBusManager.getEventBus().publish(event);
                    return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
                }

                if (req.body['remember-me']) {
                    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // Cookie expires after 30 days
                } else {
                    req.session.cookie.expires = false; // Cookie expires at end of session
                }

                await Account.updateOne({
                    username: req.body.username,
                }, {
                    $set: {
                        'safeguard.lastLogin': new Date(),
                        'safeguard.failedLoginAttempts': 0,
                    },
                }, {
                    timestamps: false, 
                });

                req.session.save((err) => {
                    if (err) {
                        log.error('Error saving session', err);
                        return next(err);
                    }

                    return next();

                });

            });

        })(req, res, next);

    },

    validateAuthentication: async (req, res, next) => {
        let payload = null;
        let client = null;
        let token = null;

        /** User has a valid cookie */
        if (req.user) {
            req.user = req.user.toJSON();
            req.user.userid = req.user._id.toString();

            req.user = await TokenUtils.resolveUserPermissions(req.user);

            return next();
        }

        if (!req.headers.authorization) {
            return next({ status: 401 });
        }

        const authType = req.headers['x-auth-type'] ? req.headers['x-auth-type'] : conf.general.authType;
        switch (authType) {
            case 'oidc':
                client = {
                    id: oidc.serviceClient.client_id,
                    secret: oidc.serviceClient.client_secret,
                };

                try {
                    const header = req.headers.authorization.split(' ');
                    const token = header[1];

                    // validate token
                    const response = await rp.post({
                        uri: `${conf.getOidcBaseUrl()}/token/introspection`,
                        headers: {
                            Authorization: basic(
                                client.id,
                                client.secret,
                            ),
                        },
                        json: true,
                        form: {
                            token,
                        },
                    });
                    if (response.active) {

                        // get userinfo
                        payload = await rp.get({
                            uri: `${conf.getOidcBaseUrl()}/me`,
                            headers: {
                                'Authorization': `Bearer ${token}`,
                            },
                            json: true,
                        });

                    } else {
                        return next({ status: 401, message: CONSTANTS.ERROR_CODES.INVALID_TOKEN });
                    }

                } catch (err) {
                    return next(err);
                }
                break;
            case 'basic':
                try {
                    const header = req.headers.authorization.split(' ');
                    if (!header || header.length < 2) {
                        log.debug('Authorization header length is incorrect');
                        return next({ status: 401, message: CONSTANTS.ERROR_CODES.INVALID_HEADER });
                    }
                    // eslint-disable-next-line
                    token = header[1];
                    payload = await TokenUtils.getAccountData(token);
                } catch (err) {
                    log.warn('Failed to parse token', err);
                    return next({ status: 401, message: CONSTANTS.ERROR_CODES.SESSION_EXPIRED });
                }
                break;
            default:
                return next({ status: 400 });
        }
        if (payload) {
            req.user = req.user || {};
            req.user.token = token;
            req.user.auth = payload;
            req.user.username = payload.username;
            req.user.tenant = payload.tenant;
            // req.user.accountType = payload.accountType;
            req.user.userid = payload._id && payload._id.toString();
            // req.user.memberships = payload.memberships || [];
            // req.user.currentContext = req.user.memberships.find(elem => elem.active === true);
            req.user.permissions = payload.permissions;
            req.user.roles = payload.roles;

            req.user = await TokenUtils.resolveUserPermissions(req.user);

            return next();
        } else {
            log.error('Token payload is empty or invalid', { payload });
            return next({ status: 401, message: CONSTANTS.ERROR_CODES.VALIDATION_ERROR });
        }

    },

    isAdmin: (req, res, next) => {

        if (req.user.isAdmin) {
            return next();
        }

        next({ status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN });

    },

    hasContext: (req, res, next) => { // TODO deprecate

        if (req.user.currentContext && req.user.currentContext.tenant) {
            return next();
        }

        next({ status: 400, message: CONSTANTS.ERROR_CODES.CONTEXT_REQUIRED });

    },

    canEditUser: (req, res, next) => {

        if (module.exports.hasPermissions({ user: req.user, requiredPermissions: [RESTRICTED_PERMISSIONS['iam.account.update']] })) {
            return next();
        }

        if (req.user.userid === req.params.id) {
            return next();
        }

        return next({ status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN });

    },

    isLoggedIn: (req, res, next) => {
        if (req.user) {
            return next();
        }

        return next({ status: 401 });

    },

    isTenantAdmin: (req, res, next) => {
        // how to be sure that this is a TenantID?
        const tenantId = req.params.id;

        if (module.exports.hasPermissions({ user: req.user, requiredPermissions: [RESTRICTED_PERMISSIONS['iam.tenant.update']] })) {
            return next();
        }
        // if (req.user.memberships && req.user.memberships.length > 0) {
        //     const found = req.user.memberships.find(element => (element.tenant === id && element.role === CONSTANTS.MEMBERSHIP_ROLES.TENANT_ADMIN));
        //     return (found && found.tenant) ? next() : next({ status: 403 });
        // }
        if (req.user.currentContext && req.user.currentContext.tenant.toString() === tenantId && req.user.currentContext.permissions.length) {
            const found = req.user.currentContext.permissions.find((element) => element === PERMISSIONS['tenant.all']);
            return found ? next() : next({ status: 403 });
        }

        return next({ status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN });

    },

    userIsAdmin: (user) => isAdminRole(user.role),

    removeCriticalAccountFields: (account) => removeEmptyProps({
        firstname: account.firstname,
        lastname: account.lastname,
        avatar: account.avatar,
        phone: account.phone,
    }),

    removeCriticalTenantFields: (tenant) => removeEmptyProps({
        name: tenant.name,
    }),

};
