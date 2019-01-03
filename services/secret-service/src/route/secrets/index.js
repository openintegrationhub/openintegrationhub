const express = require('express');
const logger = require('@basaas/node-logger');
const url = require('url');
const qs = require('qs');
const auth = require('../../middleware/auth');
const authFlowManager = require('../../auth-flow-manager');
const conf = require('../../conf');
const AuthClientDAO = require('../../dao/auth-client');
const SecretsDAO = require('../../dao/secret');
const { ROLE, AUTH_TYPE } = require('../../constant');
const { maskString } = require('../../util/common');

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
        const { page } = qs.parse(url.parse(req.originalUrl).query);

        const pSize = (page && page.size && parseInt(page.size, 10))
        || conf.pagination.pageSize;
        const pNumber = (page && page.number && parseInt(page.number, 10))
        || conf.pagination.defaultPage;

        const count = await SecretsDAO.countByEntity(req.user.sub);

        res.send({
            data: await SecretsDAO.findByEntityWithPagination(req.user.sub, pSize, pNumber),
            meta: {
                page: pNumber,
                perPage: pSize,
                total: count,
                totalPages: Math.abs(count / pSize),
            },
        });
    } catch (err) {
        log.error(err);
        next({
            status: 500,
        });
    }
});

router.post('/', async (req, res, next) => {
    try {
        const secret = await SecretsDAO.create({
            ...req.body,
            owner: {
                entityId: req.user.sub.toString(),
                entityType: ROLE.USER,
            },
        });

        res.send({ _id: secret._id });
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

router.get('/:id', auth.userIsOwnerOfSecret, async (req, res, next) => {
    try {
        const secret = req.obj;
        if (secret) {
            const refreshedSecret = await SecretsDAO.getRefreshed(secret);
            res.send(maskSecret({
                secret: refreshedSecret,
                requester: req.user,
            }));
        } else {
            res.sendStatus(403);
        }
    } catch (err) {
        log.error(err);
        next({
            status: 500,
        });
    }
});

router.patch('/:id', auth.userIsOwnerOfSecret, async (req, res, next) => {
    const obj = req.body;

    try {
        await SecretsDAO.update({
            id: req.params.id, obj, partialUpdate: false,
        });
        res.sendStatus(200);
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

router.delete('/:id', auth.userIsOwnerOfSecret, async (req, res, next) => {
    try {
        await SecretsDAO.delete({
            id: req.params.id,
        });
        res.sendStatus(200);
    } catch (err) {
        log.error(err);
        next({
            status: 500,
        });
    }
});

router.get('/:id/userinfo', auth.userIsOwnerOfSecret, async (req, res, next) => {
    try {
        const secret = req.obj;
        const authClient = await AuthClientDAO.findById(secret.value.authClientId);

        if (!authClient.endpoint.userinfo) {
            return next({
                status: 404,
            });
        }

        res.send(
            await authFlowManager.userinfoRequest(
                authClient.endpoint.userinfo,
                secret.value.accessToken,
            ),
        );
    } catch (err) {
        next({
            status: 400,
        });
    }
});

module.exports = router;
