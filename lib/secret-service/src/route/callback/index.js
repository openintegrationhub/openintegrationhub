const express = require('express');
const logger = require('@basaas/node-logger');
const url = require('url');
const qs = require('querystring');
const handleOAuth2 = require('./handle-oauth2');
const handleOAuth = require('./handle-oauth');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.logging.namespace}/callback`);

const router = express.Router();


router.get('/', async (req, res, next) => {
    try {
        const queryObject = qs.parse(url.parse(req.originalUrl).query);

        if (queryObject.code) {
            return res.send(await handleOAuth2({
                queryObject,
                req,
            }));
        }

        res.send(await handleOAuth({
            queryObject,
            req,
        }));
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

module.exports = router;
