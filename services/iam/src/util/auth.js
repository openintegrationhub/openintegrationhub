const Logger = require('@basaas/node-logger');
const passport = require('passport');
// const jwt = require('jsonwebtoken');
const jwtUtils = require('./../util/jwt');
const rp = require('request-promise');

const basic = require('../oidc/helper/basic-auth-header');
const CONSTANTS = require('../constants');
const conf = require('../conf');

const { oidc } = conf;

const log = Logger.getLogger(`${conf.general.loggingNameSpace}/auth`, {
    level: 'debug',
});

// TODO: SERVICE_ACCOUNT shouldn't have admin privileges
const isAdminRole = role => 
    role === CONSTANTS.ROLES.ADMIN ||
    role === CONSTANTS.ROLES.SERVICE_ACCOUNT;
    
module.exports = {

    userIsEnabled(req, res, next) {
        if (req.user && req.user.status === CONSTANTS.STATUS.ACTIVE) {
            return next();
        } else {
            req.logout();
            return next({ status: 401, message: CONSTANTS.ERROR_CODES.ENTITY_DISABLED });
        }
    },

    authenticate: (req, res, next) => {
        passport.authenticate('local', (err, user, passportErrorMsg) => {
 
            if (err) { return next(err); }

            if (passportErrorMsg) { 
                if (passportErrorMsg.name === 'IncorrectPasswordError') {
                    return next({ status: 401, message: CONSTANTS.ERROR_CODES.PASSWORD_INCORRECT });
                }
                if (passportErrorMsg.name === 'IncorrectUsernameError') {
                    return next({ status: 401, message: CONSTANTS.ERROR_CODES.USER_NOT_FOUND });
                }
            }
            if (!user) { return next({ status: 401, message: CONSTANTS.ERROR_CODES.DEFAULT }); }
            
            req.logIn(user, (err) => {
                if (err) {
                    log.error('Failed to login user', err);
                    return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
                }

                if (req.body['remember-me']) {
                    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // Cookie expires after 30 days
                } else {
                    req.session.cookie.expires = false; // Cookie expires at end of session
                }

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
        let authType = null;
        let client = null;

        /** User has a valid cookie */
        if (req.user) {
            req.__HEIMDAL__ = req.user;
            req.__HEIMDAL__.userid = req.user._id;
            return next();
        }

        if (!req.headers.authorization) {
            return next({ status: 401 });
        }

        authType = req.headers['x-auth-type'] ? req.headers['x-auth-type'] : conf.general.authType;
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
                    const token = header[1];
                    payload = await jwtUtils.basic.verify(token);
                } catch (err) {
                    log.warn('Failed to parse token', err);
                    return next({ status: 401, message: CONSTANTS.ERROR_CODES.SESSION_EXPIRED });
                }
                break;
            default: 
                return next({ status: 400 });
        }

        if (payload) {
            req.__HEIMDAL__ = req.__HEIMDAL__ || {};
            req.__HEIMDAL__.token = req.headers.authorization;
            req.__HEIMDAL__.auth = payload;
            req.__HEIMDAL__.username = payload.username;
            req.__HEIMDAL__.userid = payload.sub;
            req.__HEIMDAL__.memberships = payload.memberships;
            req.__HEIMDAL__.role = payload.role;
            return next();
        } else {
            log.error('JWT payload is empty or undefined', { payload });
            return next({ status: 500, message: CONSTANTS.ERROR_CODES.VALIDATION_ERROR });
        }

    },

    isAdmin: (req, res, next) => {

        if (isAdminRole(req.__HEIMDAL__.role)) {
            return next();
        } 
        
        next({ status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN });
        
    },

    paramsMatchesUserId: (req, res, next) => {

        if (isAdminRole(req.__HEIMDAL__.role)) {
            return next();
        } 
        if (req.__HEIMDAL__.userid === req.params.id) {
            return next();
        } 
        
        return next({ status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN });
        
    },

    isLoggedIn: (req, res, next) => {
        if (req.__HEIMDAL__.auth) {
            return next();
        } 
        
        return next({ status: 401 });
        
    },

    isTenantAdmin: (req, res, next) => {
        // how to be sure that this is a TenantID?
        const id = req.params.id;

        if (isAdminRole(req.__HEIMDAL__.role)) {
            return next();
        } 
        if (req.__HEIMDAL__.memberships && req.__HEIMDAL__.memberships.length > 0) {
            const found = req.__HEIMDAL__.memberships.find(element => (element.tenant === id && element.role === CONSTANTS.MEMBERSHIP_ROLES.TENANT_ADMIN));
            return (found && found.tenant) ? next() : next({ status: 403 });
        }

        return next({ status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN });
        
    },
};
