const express = require('express');
const logger = require('@basaas/node-logger');
const { can, hasOneOf } = require('@basaas/iam-lib');
const { restricted, common } = require('../../constant/permission');
const { userIsOwnerOfSecret } = require('../../middleware/auth');
const { getKeyParameter, getKey } = require('../../middleware/key');

const conf = require('../../conf');
const SecretDAO = require('../../dao/secret');
const { ROLE, AUTH_TYPE } = require('../../constant');
const { maskString, maskSecret } = require('../../util/common');
const Pagination = require('../../util/pagination');

const {
    SIMPLE, MIXED, API_KEY, OA2_AUTHORIZATION_CODE,
} = AUTH_TYPE;

const log = logger.getLogger(`${conf.logging.namespace}/secrets`);

const secretObfuscator = {

    [SIMPLE]: secretValue => ({
        ...secretValue,
        passphrase: '***',
    }),

    [MIXED]: (secretValue) => {
        return maskSecret(secretValue);
        const newObj = {};
        Object.keys(secretValue).forEach((key) => {
            newObj[key] = maskString(secretValue[key]);
        });
        return newObj;
    },

    [API_KEY]: secretValue => ({
        ...secretValue,
        key: maskString(secretValue.key),
    }),

    [OA2_AUTHORIZATION_CODE]: secretValue => ({
        ...secretValue,
        accessToken: maskString(secretValue.accessToken),
        refreshToken: maskString(secretValue.refreshToken),
    }),

};

class SecretsRouter {

    constructor({iam}) {
        this.iam = iam;
        this.setup();
        return this.router;
    }

    maskSecret ({ requester, secret }) {
        if (conf.debugMode) {
            return secret;
        }

        const maskedSecret = secret;

    if (
        requester.permissions
        && requester.permissions.length
        && requester.permissions.indexOf(common.secretReadRaw) >= 0
        || hasOneOf({ user: requester, requiredPermissions: common.secretReadRaw })
    ) {
        return maskedSecret;
    }

        if (secretObfuscator[secret.type]) {
            maskedSecret.value = secretObfuscator[secret.type](secret.value);
        }

        return maskedSecret;
    };

    setup() {

        const {can} = this.iam;

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
                    status: 500,
                });
            }
        });

        this.router.post('/', getKeyParameter, getKey, async (req, res, next) => {
            const { data } = req.body;
            try {
                res.send({
                    data: await SecretDAO.create({
                        ...data,
                        owners: [{
                            id: req.user.sub.toString(),
                            type: ROLE.USER,
                        }],
                    }, req.key),
                });
            } catch (err) {
                log.error(err);
                next({
                    status: 400,
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
                    status: 500,
                });
            }
        });

        this.router.patch('/:id', userIsOwnerOfSecret, getKeyParameter, getKey, async (req, res, next) => {
            const { data } = req.body;
            try {
                res.send({
                    data: await SecretDAO.update({
                        id: req.params.id, data,
                    }),
                });
            } catch (err) {
                log.error(err);
                next({
                    status: 400,
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
                    status: 500,
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
                    status: 500,
                });
            }
        });

    }
}



module.exports = SecretsRouter;
