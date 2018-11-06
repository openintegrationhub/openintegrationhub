const express = require('express');
const bodyParser = require('body-parser');
const logger = require('@basaas/node-logger');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.logging.namespace}/secrets`);

const jsonParser = bodyParser.json();
const router = express.Router();

router.get('/', async (req, res, next) => {
    res.sendStatus(200);
});

router.post('/', async (req, res, next) => {
    res.sendStatus(200);
});

router.get('/:id', async (req, res, next) => {
    res.sendStatus(200);
});

router.put('/:id', async (req, res, next) => {
    res.sendStatus(200);
});

router.patch('/:id', async (req, res, next) => {
    res.sendStatus(200);
});

module.exports = router;
