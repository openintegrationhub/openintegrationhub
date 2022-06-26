const express = require('express');
const logger = require('@basaas/node-logger');
const { restricted, common } = require('../../constant/permission');
const { getKeyParameter, getKey } = require('../../middleware/key');

const conf = require('../../conf');
const SecretDAO = require('../../dao/secret');
const { ROLE, AUTH_TYPE } = require('../../constant');
const { maskString, maskSecret } = require('../../util/common');
const Pagination = require('../../util/pagination');

const {
    SIMPLE, MIXED, API_KEY, OA2_AUTHORIZATION_CODE, SESSION_AUTH,
} = AUTH_TYPE;

const log = logger.getLogger(`${conf.log.namespace}/secrets`);

const secretObfuscator = {
    [SIMPLE]: (secretValue) => ({
        ...secretValue,
        passphrase: '***',
    }),

    [MIXED]: (secretValue) => maskSecret(secretValue),

    [API_KEY]: (secretValue) => ({
        ...secretValue,
        key: maskString(secretValue.key),
    }),

    [OA2_AUTHORIZATION_CODE]: (secretValue) => ({
        ...secretValue,
        accessToken: maskString(secretValue.accessToken),
        refreshToken: maskString(secretValue.refreshToken),
    }),

    [SESSION_AUTH]: (secretValue) => ({
        ...secretValue,
        inputFields: '***',
    }),

};

class SecretsRouter {
    constructor({ iam }) {
        this.iam = iam;
        this.setup();
        return this.router;
    }

    maskSecret({ requester, secret }) {
        if (conf.debugMode) {
            return secret;
        }

        const maskedSecret = secret;

        if (
            (requester.permissions
            && requester.permissions.length
            && requester.permissions.indexOf(common.secretReadRaw) >= 0)
            || this.iam.hasOneOf({ user: requester, requiredPermissions: common.secretReadRaw })
        ) {
            return maskedSecret;
        }

        if (secretObfuscator[secret.type]) {
            maskedSecret.value = secretObfuscator[secret.type](secret.value);
        }

        return maskedSecret;
    }

    ownersIsValid(owners, user) {
        let tenantIdMismatch = null;
        try {
            if (owners && owners.length) {
                tenantIdMismatch = owners.find((owner) => owner.type === 'TENANT' && owner.id.toString() !== user.tenant.toString());
            }
        } catch (e) {
            log.error(e);
            tenantIdMismatch = 1;
        }

        return !tenantIdMismatch;
    }

    setup() {
        const { can, userIsOwnerOfSecret } = this.iam;

        this.router = express.Router();

        this.router.get('/', async (req, res, next) => {
            try {
                const pagination = new Pagination(req.originalUrl, SecretDAO, req.user.sub);
                res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

                res.send({
                    data: await SecretDAO.findByEntityWithPagination(
                        req.user.sub,
                        pagination.props(),
                    ),
                    meta: {
                        ...await pagination.calc(),
                    },
                });
            } catch (err) {
                log.error(err);
                next({
                    err,
                    status: 500,
                    message: err.message,
                });
            }
        });

        this.router.post('/', getKeyParameter, getKey, async (req, res, next) => {
            const data = req.body.data ? req.body.data : req.body;
            try {
                if (!this.ownersIsValid(data.owners, req.user)) {
                    return next({
                        status: 400,
                        message: 'Owners is not valid',
                    });
                }

                const owners = [{
                    id: req.user.sub.toString(),
                    type: ROLE.USER,
                }].concat(data.owners && data.owners.length ? data.owners : []);
                res.send({
                    data: await SecretDAO.create({
                        ...data,
                        owners,
                    }, req.key),
                });
            } catch (err) {
                log.error(err);
                next({
                    err,
                    status: 400,
                    message: err.message,
                });
            }
        });

        this.router.get('/:id', userIsOwnerOfSecret, getKeyParameter, getKey, async (req, res, next) => {
            try {
                const secret = req.obj;
                if (secret) {
                    const refreshedSecret = await SecretDAO.getRefreshed(secret, req.key);
                    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
                    res.send({
                        data: this.maskSecret({
                            secret: refreshedSecret,
                            requester: req.user,
                        }),
                    });
                } else {
                    res.sendStatus(403);
                }
            } catch (err) {
                log.error(err, { 'x-request-id': req.headers['x-request-id'] });
                next({
                    err,
                    status: 500,
                    message: err.message,
                });
            }
        });

        this.router.patch('/:id', userIsOwnerOfSecret, getKeyParameter, getKey, async (req, res, next) => {
            const data = req.body.data ? req.body.data : req.body;
            try {
                if (!this.ownersIsValid(data.owners, req.user)) {
                    return next({
                        status: 400,
                        message: 'Owners is not valid',
                    });
                }

                res.send({
                    data: await SecretDAO.update({
                        id: req.params.id,
                        data,
                    }, req.key),
                });
            } catch (err) {
                log.error(err);
                next({
                    status: 400,
                    err,
                    message: err.message,
                });
            }
        });

        this.router.post('/:id/owners', userIsOwnerOfSecret, async (req, res, next) => {
            const data = req.body.data ? req.body.data : req.body;

            if (!data || !data.id) {
                return next({
                    status: 400,
                    message: 'Owners cannot be empty. Body must contain data: { id: String, type?: String }',
                });
            }

            try {
                res.send({
                    data: await SecretDAO.addOwner({
                        id: req.params.id,
                        ownerId: data.id,
                    }),
                });
            } catch (err) {
                log.error(err);
                next({
                    err,
                    status: 400,
                    message: err.message,
                });
            }
        });

        this.router.delete('/:id/owners', userIsOwnerOfSecret, async (req, res, next) => {
            const { id, type } = req.query;

            if (!id) {
                return next({
                    status: 400,
                    message: 'Provide valid owner id and type as query parameters',
                });
            }

            try {
                res.send({
                    data: await SecretDAO.removeOwner({
                        id: req.params.id,
                        ownerId: id,
                        type,
                    }),
                });
            } catch (err) {
                log.error(err);
                next({
                    err,
                    status: 400,
                    message: err.message,
                });
            }
        });

        this.router.delete('/:id', userIsOwnerOfSecret, async (req, res, next) => {
            try {
                await SecretDAO.delete({
                    id: req.params.id,
                    ownerId: req.user.sub.toString(),
                });
                res.sendStatus(204);
            } catch (err) {
                log.error(err);
                next({
                    err,
                    status: 500,
                    message: err.message,
                });
            }
        });

        this.router.delete('/', can(restricted.secretDeleteAny), async (req, res, next) => {
            const { userId, type } = req.query;

            try {
                await SecretDAO.deleteAll({
                    ownerId: userId,
                    type,
                });

                res.sendStatus(200);
            } catch (err) {
                log.error(err);
                next({
                    err,
                    status: 500,
                    message: err.message,
                });
            }
        });

        this.router.post('/:id/validateHmac', userIsOwnerOfSecret, getKeyParameter, getKey, async (req, res, next) => {
            try {
                const secret = req.obj;
                const data = req.body.data ? req.body.data : req.body;
                const { hmacValue, hmacAlgo, rawBody } = data;
                if (secret) {
                    const isValid = await SecretDAO.authenticateHmac({
                        secret, key: req.key, hmacValue, hmacAlgo, rawBody,
                    });
                    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
                    res.send({
                        data: isValid,
                    });
                } else {
                    res.sendStatus(403);
                }
            } catch (err) {
                log.error(err, { 'x-request-id': req.headers['x-request-id'] });
                next({
                    err,
                    status: 500,
                    message: err.message,
                });
            }
        });
    }
}

module.exports = SecretsRouter;
