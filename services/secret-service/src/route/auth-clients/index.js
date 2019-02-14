const express = require('express');
const bodyParser = require('body-parser');
const logger = require('@basaas/node-logger');
const base64url = require('base64url');
const AuthClientDAO = require('../../dao/auth-client');
const AuthFlowDAO = require('../../dao/auth-flow');
const auth = require('../../middleware/auth');
const { getKeyParameter } = require('../../middleware/key');
const { can } = require('../../middleware/permission');
const conf = require('../../conf');
const { restricted } = require('../../constant').PERMISSIONS;
const { ROLE } = require('../../constant');
const authFlowManager = require('../../auth-flow-manager');
const Pagination = require('../../util/pagination');
const { OA2_AUTHORIZATION_CODE } = require('../../constant').AUTH_TYPE;

const log = logger.getLogger(`${conf.logging.namespace}/auth-client`);

const jsonParser = bodyParser.json();
const router = express.Router();

const authClientObfuscator = {

    [OA2_AUTHORIZATION_CODE]: value => ({
        ...value,
        clientId: '***',
        clientSecret: '***',
    }),

};

const maskAuthClient = ({ requester, authClient }) => {
    if (conf.debugMode) {
        return authClient;
    }

    let maskedAuthClient = authClient;

    if (requester.permissions && requester.permissions.length && requester.permissions.indexOf('auth-clients.raw.read') >= 0) {
        return maskedAuthClient;
    }

    if (authClientObfuscator[authClient.type]) {
        maskedAuthClient = authClientObfuscator[authClient.type](authClient);
    }

    return maskedAuthClient;
};


router.get('/', async (req, res, next) => {
    try {
        const pagination = new Pagination(req.originalUrl, AuthClientDAO, req.user.sub);

        res.send({
            data: await AuthClientDAO.findWithPagination(
                {},
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

router.post('/', async (req, res, next) => {
    const { data } = req.body;
    try {
        res.send({
            data: maskAuthClient({
                authClient: await AuthClientDAO.create({
                    ...data,
                    owners: {
                        id: req.user.sub.toString(),
                        type: ROLE.USER,
                    },
                }),
                requester: req.user,
            }),
        });
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

router.get('/:id', auth.userIsOwnerOfAuthClient, (req, res) => {
    res.send({
        data: maskAuthClient({
            authClient: req.obj,
            requester: req.user,
        }),
    });
});

router.patch('/:id', auth.userIsOwnerOfAuthClient, async (req, res, next) => {
    const { data } = req.body;
    try {
        res.send({
            data: maskAuthClient({
                authClient: await AuthClientDAO.update({
                    id: req.params.id, data, partialUpdate: false,
                }),
                requester: req.user,
            }),
        });
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

router.delete('/:id', auth.userIsOwnerOfAuthClient, async (req, res, next) => {
    try {
        await AuthClientDAO.delete(req.obj);
        res.sendStatus(204);
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

router.delete('/', can([restricted['auth-clients.any.delete']]), async (req, res, next) => {
    const { userId, type } = req.query;

    try {
        await AuthClientDAO.deleteAll({
            owners: {
                id: userId,
                type,
            },
        });

        res.sendStatus(200);
    } catch (err) {
        log.error(err);
        next({
            status: 500,
        });
    }
});

router.post('/:id/start-flow', getKeyParameter, /* auth.userIsOwnerOfAuthClient, */ jsonParser, async (req, res, next) => {
    const authClient = await AuthClientDAO.findOne({ _id: req.params.id });
    const { data } = req.body;
    try {
        // const authClient = req.obj;
        const flow = await AuthFlowDAO.create({
            creator: req.user.sub,
            creatorType: ROLE.USER,
            scope: data.scope,
            secretName: data.secretName,
            authClientId: authClient._id,
            type: authClient.type,
            keyParameter: req.keyParameter,
            successUrl: data.successUrl,
        });

        const authUrl = await authFlowManager.start(
            authClient,
            data.scope || '',
            // state
            base64url(JSON.stringify({
                flowId: flow._id,
                payload: data.payload || {},
            })),
        );

        res.send({
            data: {
                authUrl,
            },
        });
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

module.exports = router;
