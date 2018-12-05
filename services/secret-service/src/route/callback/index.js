const express = require('express');
const logger = require('@basaas/node-logger');
const url = require('url');
const qs = require('querystring');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const AuthClientDAO = require('../../dao/auth-client');
const AuthFlowDAO = require('../../dao/auth-flow');
const SecretDAO = require('../../dao/secret');
const TokenDAO = require('../../dao/token');
const authFlowManager = require('../../auth-flow-manager');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.logging.namespace}/callback`);

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const queryObject = qs.parse(url.parse(req.originalUrl).query);
        const code = queryObject.code;
        const state = queryObject.state;

        const flow = await AuthFlowDAO.findById(state);
        const authClient = await AuthClientDAO.findById(flow.authClientId);

        const tokens = await authFlowManager.continue(
            authClient,
            code,
        );

        const expires = moment().add(tokens.expires_in, 'seconds');

        const idToken = jwt.decode(tokens.id_token) || {};

        let secret = await SecretDAO.findBySubAndAuthClientId(idToken.sub, authClient._id);

        if (secret) {
            // update existing secret & token
            secret.value.scope = flow.scope;
            secret.value.expires = expires;
            secret.value.refreshToken = tokens.refresh_token || secret.value.refreshToken;
            await secret.save();

            const token = await TokenDAO.findBySecretId(secret._id);
            token.value = tokens.access_token;
            token.expires = expires;

            await token.save();
        } else {
            // create new secret & token
            secret = await SecretDAO.create({
                name: authClient.name,
                owner: {
                    entityId: flow.creator,
                    entityType: flow.creatorType,
                },
                type: authClient.type,
                value: {
                    sub: idToken.sub || '',
                    authClientId: authClient._id,
                    refreshToken: tokens.refresh_token,
                    scope: flow.scope,
                    endpoint: {
                        refresh: authClient.property.endpoint.refresh,
                    },
                    expires,
                },
            });

            await TokenDAO.create({
                secretId: secret._id,
                value: tokens.access_token,
                expires,
            });
        }

        res.sendStatus(200);
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

module.exports = router;
