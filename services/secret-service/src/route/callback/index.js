const express = require('express');
const logger = require('@basaas/node-logger');
const url = require('url');
const qs = require('querystring');
const moment = require('moment');
const base64url = require('base64url');
const AuthClientDAO = require('../../dao/auth-client');
const AuthFlowDAO = require('../../dao/auth-flow');
const SecretDAO = require('../../dao/secret');
const authFlowManager = require('../../auth-flow-manager');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.logging.namespace}/callback`);

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const queryObject = qs.parse(url.parse(req.originalUrl).query);
        const code = queryObject.code;

        const stateObject = JSON.parse(base64url.decode(queryObject.state));

        const flow = await AuthFlowDAO.findById(stateObject.flowId);

        const authClient = await AuthClientDAO.findById(flow.authClientId);

        // request tokens
        const tokens = await authFlowManager.continue(
            authClient,
            code,
        );
        //

        const expires = moment().add(tokens.expires_in, 'seconds').toISOString();

        const externalId = await authFlowManager.getExternalId(authClient, tokens);
        if (!externalId) {
            log.error(new Error('Could not find external id.'));
            return next({
                status: 400,
            });
        }

        const scope = authFlowManager.getScope(authClient, tokens);
        if (!scope) {
            log.error(new Error('Could not find scope in token response.'));
            return next({
                status: 400,
            });
        }

        let secret = await SecretDAO.findByExternalId(externalId, flow.authClientId);

        if (secret) {
            // update existing secret & token
            secret.value.scope = scope;
            secret.value.expires = expires;
            secret.value.refreshToken = tokens.refresh_token;
            secret.value.accessToken = tokens.access_token;
            await secret.save();
        } else {
            // create new secret & token
            secret = await SecretDAO.create({
                name: authClient.name,
                owners: {
                    entityId: flow.creator,
                    entityType: flow.creatorType,
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
            });
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
