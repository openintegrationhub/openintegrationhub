const express = require('express');
const logger = require('@basaas/node-logger');
const url = require('url');
const qs = require('querystring');
const moment = require('moment');
const base64url = require('base64url');
const crypto = require('crypto');
const AuthClientDAO = require('../../dao/auth-client');
const AuthFlowDAO = require('../../dao/auth-flow');
const SecretDAO = require('../../dao/secret');
const authFlowManager = require('../../auth-flow-manager');
const conf = require('../../conf');
const { getKey } = require('../../middleware/key');

const log = logger.getLogger(`${conf.logging.namespace}/callback`);

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const queryObject = qs.parse(url.parse(req.originalUrl).query);
        const code = queryObject.code;

        const stateObject = JSON.parse(base64url.decode(queryObject.state));

        const flow = await AuthFlowDAO.findById(stateObject.flowId);

        const authClient = await AuthClientDAO.findById(flow.authClientId);

        // fetch key
        req.keyParameter = flow.keyParameter;
        const key = await getKey(req);

        // request tokens
        const tokens = await authFlowManager.continue(
            authClient,
            code,
        );
        //

        const expires = !Number.isNaN(tokens.expires_in)
            ? moment().add(tokens.expires_in, 'seconds').toISOString() : moment(1e15).toISOString();

        let externalId = await authFlowManager.getExternalData(authClient, tokens, 'externalId');

        if (externalId) {
            const hash = crypto.createHash(conf.crypto.alg.hash);
            hash.update(externalId);
            externalId = hash.digest('hex');
        }

        const scope = tokens.scope || tokens.scopes || flow.scope;

        // try to find secret by external id to prevent duplication
        let secret = externalId && await SecretDAO.findByExternalId(externalId, flow.authClientId);

        if (secret) {
            secret = await SecretDAO.update({
                id: secret._id,
                data: {
                    value: {
                        scope,
                        expires,
                        externalId,
                        refreshToken: tokens.refresh_token,
                        accessToken: tokens.access_token,
                    },
                },
            });
        } else {
            // create new secret
            secret = await SecretDAO.create({
                name: flow.secretName || authClient.name,
                owners: {
                    id: flow.creator,
                    type: flow.creatorType,
                },
                type: authClient.type,
                value: {
                    authClientId: authClient._id,
                    refreshToken: tokens.refresh_token,
                    accessToken: tokens.access_token,
                    scope,
                    externalId,
                    expires,
                },
            }, key);
        }
        // clean up flow data
        await AuthFlowDAO.delete(flow._id);
        res.sendStatus(200);
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

module.exports = router;
