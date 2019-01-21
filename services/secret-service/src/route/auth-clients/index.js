const express = require('express');
const bodyParser = require('body-parser');
const logger = require('@basaas/node-logger');
const base64url = require('base64url');
const AuthClientDAO = require('../../dao/auth-client');
const AuthFlowDAO = require('../../dao/auth-flow');
const auth = require('../../middleware/auth');
const conf = require('../../conf');
const { ROLE } = require('../../constant');
const authFlowManager = require('../../auth-flow-manager');

const log = logger.getLogger(`${conf.logging.namespace}/auth-client`);

const jsonParser = bodyParser.json();
const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        // res.send(await AuthClientDAO.findByEntity(req.user.sub));
        res.send(await AuthClientDAO.find());
    } catch (err) {
        log.error(err);
        next({
            status: 500,
        });
    }
});

router.post('/', async (req, res, next) => {
    try {
        const authClient = await AuthClientDAO.create({
            ...req.body,
            owners: {
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
    res.send(req.obj);
});

router.patch('/:id', auth.userIsOwnerOfAuthClient, async (req, res, next) => {
    const obj = req.body;

    try {
        await AuthClientDAO.update({
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

router.delete('/:id', auth.userIsOwnerOfAuthClient, async (req, res, next) => {
    try {
        await AuthClientDAO.delete(req.obj);
        res.sendStatus(200);
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

router.post('/:id/start-flow', /* auth.userIsOwnerOfAuthClient, */ jsonParser, async (req, res, next) => {
    const authClient = await AuthClientDAO.findOne({ _id: req.params.id });

    try {
        // const authClient = req.obj;
        const flow = await AuthFlowDAO.create({
            creator: req.user.sub,
            creatorType: ROLE.USER,
            authClientId: authClient._id,
            type: authClient.type,
        });

        const authUrl = await authFlowManager.start(
            authClient,
            req.body.scope || '',
            // state
            base64url(JSON.stringify({
                flowId: flow._id,
                payload: req.body.payload || {},
            })),
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
