const express = require('express');
const bodyParser = require('body-parser');
const logger = require('@basaas/node-logger');
const auth = require('../../middleware/auth');
const conf = require('../../conf');
const SecretsDAO = require('../../dao/secret');
const { ROLE } = require('../../constant');

const log = logger.getLogger(`${conf.logging.namespace}/secrets`);

const jsonParser = bodyParser.json();
const router = express.Router();

router.use(auth.isLoggedIn);

router.get('/', async (req, res, next) => {
    try {
        res.send(await SecretsDAO.findByEntity(req.user.sub));
    } catch (err) {
        log.error(err);
        next({
            status: 500,
        });
    }
});

router.post('/', jsonParser, async (req, res, next) => {
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
    // TODO send 403 if user is not an owner of the resource
    try {
        const secret = await SecretsDAO.findOne({
            _id: req.params.id,
            'owner.entityId': req.user.sub,
        });
        if (secret) {
            res.send(secret);
        } else {
            res.sendStatus(404);
        }
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

router.put('/:id', jsonParser, auth.userIsOwnerOfSecret, async (req, res, next) => {
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

router.patch('/:id', jsonParser, auth.userIsOwnerOfSecret, async (req, res, next) => {
    const obj = req.body;

    try {
        await SecretsDAO.update({
            id: req.params.id, obj, partialUpdate: true,
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

router.get('/:id/access-token', async (req, res, next) => {
    res.sendStatus(200);
});

router.get('/:id/audit', async (req, res, next) => {
    res.sendStatus(200);
});

module.exports = router;
