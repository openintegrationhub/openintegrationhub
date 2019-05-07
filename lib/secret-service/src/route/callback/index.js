const express = require('express');
const logger = require('@basaas/node-logger');
const url = require('url');
const qs = require('querystring');
const moment = require('moment');
const base64url = require('base64url');
const find = require('lodash/find');
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
        log.debug('query object');
        log.debug(queryObject);

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
        log.debug('NEW TOKENS');
        log.debug(tokens);

        const scope = tokens.scope || tokens.scopes || flow.scope;

        const expires = (tokens.expires_in !== undefined && !Number.isNaN(tokens.expires_in))
            ? moment().add(tokens.expires_in, 'seconds').format() : moment(1e15).format();

        let secret = {
            owners: [{
                id: flow.creator,
                type: flow.creatorType,
            }],
            type: authClient.type,
            value: {
                authClientId: authClient._id,
                refreshToken: tokens.refresh_token,
                accessToken: tokens.access_token,
                scope,
                expires,
            },
        };

        // preprocess secret

        secret = await authFlowManager.preprocessSecret({
            flow,
            authClient,
            secret,
            tokenResponse: tokens,
            localMiddleware: req.app.locals.middleware,
        });

        secret.name = flow.secretName
            || secret.name
            || secret.value.externalId
            || authClient.name;

        // try to find secret by external id to prevent duplication
        const _secret = await SecretDAO.findByExternalId(
            secret.value.externalId,
            flow.authClientId,
        );

        if (_secret) {
            const updateValues = {
                id: _secret._id,
                data: {
                    value: {
                        scope,
                        expires,
                        refreshToken: tokens.refresh_token,
                        accessToken: tokens.access_token,
                    },
                },
            };

            if (!find(_secret.owners, { id: flow.creator })) {
                updateValues.data.owners = _secret.owners;
                updateValues.data.owners.push({
                    id: flow.creator,
                    type: flow.creatorType,
                });
            }

            await SecretDAO.update(updateValues, key);
        } else {
            // create new secret
            await SecretDAO.create(secret, key);
        }
        // clean up flow data
        await AuthFlowDAO.delete(flow._id);
        // res.sendStatus(200);
        res.send({
            data: {
                successUrl: flow.successUrl,
            },
        });
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

module.exports = router;
