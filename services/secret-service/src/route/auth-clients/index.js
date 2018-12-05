const express = require('express');
const bodyParser = require('body-parser');
const logger = require('@basaas/node-logger');
const AuthClientDAO = require('../../dao/auth-client');
const AuthFlowDAO = require('../../dao/auth-flow');
const auth = require('../../middleware/auth');
const conf = require('../../conf');
const { ROLE } = require('../../constant');
const authFlowManager = require('../../auth-flow-manager');

const log = logger.getLogger(`${conf.logging.namespace}/auth-client`);

const jsonParser = bodyParser.json();
const router = express.Router();

router.use(auth.isLoggedIn);

router.get('/', async (req, res, next) => {
    try {
        res.send(await AuthClientDAO.findByEntity(req.user.sub));
    } catch (err) {
        log.error(err);
        next({
            status: 500,
        });
    }
});

router.post('/', jsonParser, async (req, res, next) => {
    try {
        const authClient = await AuthClientDAO.create({
            ...req.body,
            owner: {
                entityId: req.user.sub.toString(),
                entityType: ROLE.USER,
            },
        });

        res.send({ authClientId: authClient._id });
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

router.get('/:id', auth.userIsOwnerOfAuthClient, async (req, res) => {
    res.sendStatus(200);
});

router.patch('/:id', auth.userIsOwnerOfAuthClient, async (req, res) => {
    res.sendStatus(200);
});

router.post('/:id/start-flow', auth.userIsOwnerOfAuthClient, jsonParser, async (req, res, next) => {
    try {
        const authClient = req.obj;

        const flow = await AuthFlowDAO.create({
            creator: req.user.sub,
            creatorType: ROLE.USER,
            scope: req.body.scope,
            authClientId: authClient._id,
            type: authClient.type,
        });

        const authUrl = await authFlowManager.start(
            authClient,
            flow,
        );

        res.send({
            authUrl,
        });
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

module.exports = router;
