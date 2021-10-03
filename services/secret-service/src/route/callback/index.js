const express = require('express');
const logger = require('@basaas/node-logger');
const url = require('url');
const qs = require('querystring');
const handleOAuth2 = require('./handle-oauth2');
const handleOAuth = require('./handle-oauth');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.log.namespace}/callback`, {
    level: conf.log.level,
});

const router = express.Router();


router.get('/', async (req, res, next) => {
    try {
        const queryObject = qs.parse(url.parse(req.originalUrl).query);

        if (queryObject.code) {
            const oAuth2Result = await handleOAuth2({
                queryObject,
                req,
            });

            if (!oAuth2Result.data.successUrl) {
                return res.send(oAuth2Result);
            }

            let redirectUrl = '';
            if (oAuth2Result.data.successUrl.indexOf('?') === -1) {
                redirectUrl = `${oAuth2Result.data.successUrl}?secretId=${oAuth2Result.data.secretId}`;
            } else {
                redirectUrl = `${oAuth2Result.data.successUrl}&secretId=${oAuth2Result.data.secretId}`;
            }

            return res.redirect(redirectUrl);
        }

        res.send(await handleOAuth({
            queryObject,
            req,
        }));
    } catch (err) {
        log.error(err);
        next({
            status: 400,
            message: err.message || err,
        });
    }
});

module.exports = router;
