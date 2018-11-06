const express = require('express');
const bodyParser = require('body-parser');
const logger = require('@basaas/node-logger');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.logging.namespace}/audits`);

const jsonParser = bodyParser.json();
const router = express.Router();

router.get('/', async (req, res, next) => {
    res.sendStatus(200);
});

module.exports = router;
