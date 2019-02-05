const express = require('express');
const logger = require('@basaas/node-logger');
const auth = require('../../middleware/auth');
const { getKeyParameter, getKey } = require('../../middleware/key');
const conf = require('../../conf');
const SecretDAO = require('../../dao/secret');
const { ROLE, AUTH_TYPE } = require('../../constant');
const { maskString } = require('../../util/common');
const Pagination = require('../../util/pagination');

const {
    SIMPLE, API_KEY, OA2_AUTHORIZATION_CODE,
} = AUTH_TYPE;

const log = logger.getLogger(`${conf.logging.namespace}/secrets`);

const router = express.Router();

const secretObfuscator = {

    [SIMPLE]: secretValue => ({
        ...secretValue,
        passphrase: '***',
    }),

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

const maskSecret = ({ requester, secret }) => {
    if (conf.debugMode) {
        return secret;
    }

    const maskedSecret = secret;

    if (requester.permissions && requester.permissions.length && requester.permissions.indexOf('secrets.raw.read') >= 0) {
        return maskedSecret;
    }

    if (secretObfuscator[secret.type]) {
        maskedSecret.value = secretObfuscator[secret.type](secret.value);
    }

    return maskedSecret;
};

// router.use(auth.isLoggedIn);

router.get('/', async (req, res, next) => {
    try {
        const pagination = new Pagination(req.originalUrl, SecretDAO, req.user.sub);
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

router.post('/', getKeyParameter, getKey, async (req, res, next) => {
    const { data } = req.body;
    try {
        res.send({
            data: await SecretDAO.create({
                ...data,
                owners: {
                    id: req.user.sub.toString(),
                    type: ROLE.USER,
                },
            }, req.key),
        });
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

router.get('/:id', auth.userIsOwnerOfSecret, getKeyParameter, getKey, async (req, res, next) => {
    try {
        const secret = req.obj;

        if (secret) {
            const refreshedSecret = await SecretDAO.getRefreshed(secret, req.key);
            res.send({
                data: maskSecret({
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

router.patch('/:id', auth.userIsOwnerOfSecret, getKeyParameter, getKey, async (req, res, next) => {
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

router.delete('/:id', auth.userIsOwnerOfSecret, async (req, res, next) => {
    try {
        await SecretDAO.delete({
            id: req.params.id,
        });
        res.sendStatus(204);
    } catch (err) {
        log.error(err);
        next({
            status: 500,
        });
    }
});

module.exports = router;
