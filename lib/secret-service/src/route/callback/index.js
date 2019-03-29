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

        const expires = (tokens.expires_in !== undefined && !Number.isNaN(tokens.expires_in))
            ? moment().add(tokens.expires_in, 'seconds').format() : moment(1e15).format();

        const externalId = await authFlowManager.getExternalData(
            req.app.locals.middleware,
            authClient,
            tokens,
            'externalId',
        );

        // // fallback to generated id if not existing
        // if (!externalId) {
        //     externalId = uuid.v4();
        // }

        const scope = tokens.scope || tokens.scopes || flow.scope;

        // try to find secret by external id to prevent duplication
        let secret = externalId && await SecretDAO.findByExternalId(externalId, flow.authClientId);

        if (secret) {
            const updatedValues = {
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
            };

            if (!find(secret.owners, { id: flow.creator })) {
                updatedValues.data.owners = secret.owners;
                updatedValues.data.owners.push({
                    id: flow.creator,
                    type: flow.creatorType,
                });
            }

            secret = await SecretDAO.update(updatedValues);
        } else {
            // create new secret
            secret = await SecretDAO.create({
                name: flow.secretName || authClient.name,
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
                    externalId,
                    expires,
                },
            }, key);
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
