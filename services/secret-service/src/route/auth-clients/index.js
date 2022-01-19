const express = require('express');
const bodyParser = require('body-parser');
const logger = require('@basaas/node-logger');
const base64url = require('base64url');
const { restricted, common } = require('../../constant/permission');
const AuthClientDAO = require('../../dao/auth-client');
const AuthFlowDAO = require('../../dao/auth-flow');
const { findByAuthClient } = require('../../dao/secret');
const { userIsOwnerOfAuthClient } = require('../../middleware/auth');
const { getKeyParameter } = require('../../middleware/key');
const conf = require('../../conf');

const { ROLE, ENTITY_TYPE, AUTH_TYPE } = require('../../constant');
const authFlowManager = require('../../auth-flow-manager');
const Pagination = require('../../util/pagination');
const { OA2_AUTHORIZATION_CODE } = require('../../constant').AUTH_TYPE;

const log = logger.getLogger(`${conf.log.namespace}/auth-client`);

const jsonParser = bodyParser.json();

const authClientObfuscator = {

    [OA2_AUTHORIZATION_CODE]: (value) => ({
        ...value,
        clientId: '***',
        clientSecret: '***',
    }),
};

const maskAuthClient = ({ requester, authClient }) => {
    if (conf.debugMode) {
        return authClient;
    }

    let maskedAuthClient = authClient;

    if (requester.permissions
        && requester.permissions.length
        && requester.permissions.indexOf(common.authClientReadRaw) >= 0) {
        return maskedAuthClient;
    }

    if (authClientObfuscator[authClient.type]) {
        maskedAuthClient = authClientObfuscator[authClient.type](authClient);
    }

    return maskedAuthClient;
};

class AuthClientRouter {
    constructor({ iam }) {
        this.iam = iam;
        this.setup();
        return this.router;
    }

    setup() {
        const { can } = this.iam;

        this.router = express.Router();

        this.router.get('/', async (req, res, next) => {
            try {
                const pagination = new Pagination(req.originalUrl, AuthClientDAO, req.user.sub);

                res.send({
                    data: await AuthClientDAO.findWithPagination(
                        {},
                        pagination.props(),
                    ),
                    meta: {
                        ...await pagination.calc(),
                    },
                });
            } catch (err) {
                log.error(err);
                next({
                    err,
                    status: 500,
                    message: err.message,
                });
            }
        });

        this.router.post('/', async (req, res, next) => {
            const data = req.body.data ? req.body.data : req.body;
            try {
                res.send({
                    data: maskAuthClient({
                        authClient: await AuthClientDAO.create({
                            ...data,
                            owners: [{
                                id: req.user.sub.toString(),
                                type: ENTITY_TYPE.USER,
                            }],
                            tenant: req.user.tenant,
                        }),
                        requester: req.user,
                    }),
                });
            } catch (err) {
                log.error(err);
                next({
                    err,
                    status: 400,
                    message: err.message,
                });
            }
        });

        this.router.get('/:id', userIsOwnerOfAuthClient, async (req, res) => {
            const authClient = await AuthClientDAO.findOne({
                _id: req.params.id,
            });

            res.send({
                data: maskAuthClient({
                    authClient,
                    requester: req.user,
                }),
            });
        });

        this.router.patch('/:id', userIsOwnerOfAuthClient, async (req, res, next) => {
            const data = req.body.data ? req.body.data : req.body;
            try {
                if (data.owners && !data.owners.find((owner) => owner.persistentEntry)) {
                    const authClient = await AuthClientDAO.findOne({
                        _id: req.params.id,
                    });
                    data.owners.push(authClient.owners.find((owner) => owner.persistentEntry));
                }
                res.send({
                    data: maskAuthClient({
                        authClient: await AuthClientDAO.update({
                            id: req.params.id, data, partialUpdate: false,
                        }),
                        requester: req.user,
                    }),
                });
            } catch (err) {
                log.error(err);
                next({
                    err,
                    status: 400,
                    message: err.message,
                });
            }
        });

        this.router.delete('/:id', userIsOwnerOfAuthClient, async (req, res, next) => {
            const authClient = await AuthClientDAO.findOne({
                _id: req.params.id,
            });

            try {
                await AuthClientDAO.delete({
                    id: authClient._id,
                    ownerId: req.user.sub.toString(),
                });
                res.sendStatus(204);
            } catch (err) {
                log.error(err);
                next({
                    err,
                    status: 400,
                    message: err.message,
                });
            }
        });

        this.router.delete('/', can([restricted.authClientDeleteAny]), async (req, res, next) => {
            const { ownerId, type } = req.query;

            try {
                await AuthClientDAO.deleteAll({
                    ownerId,
                    type,
                });

                res.sendStatus(200);
            } catch (err) {
                log.error(err);
                next({
                    err,
                    status: 500,
                    message: err.message,
                });
            }
        });

        this.router.get('/:id/secrets', /* userIsOwnerOfAuthClient, */ async (req, res, next) => {
            try {
                const secrets = await findByAuthClient(
                    req.user.sub,
                    req.params.id,
                );
                res.send({
                    data: secrets,
                });
            } catch (err) {
                log.error(err);
                next({
                    err,
                    status: 400,
                    message: err.message,
                });
            }
        });

        this.router.post('/:id/start-flow', getKeyParameter, /* auth.userIsOwnerOfAuthClient, */ jsonParser, async (req, res, next) => {
            const authClient = await AuthClientDAO.findOne({ _id: req.params.id });
            const data = req.body.data ? req.body.data : req.body;

            try {
                if (authClient.type === AUTH_TYPE.SESSION_AUTH) {
                    return next({
                        status: 405,
                        message: 'No Flows Defined',
                    });
                }
                // const authClient = req.obj;
                const flow = await AuthFlowDAO.create({
                    creator: req.user.sub,
                    creatorType: ROLE.USER,
                    scope: data.scope,
                    secretName: data.secretName,
                    authClientId: authClient._id,
                    type: authClient.type,
                    keyParameter: req.keyParameter,
                    successUrl: data.successUrl,
                });

                const authUrl = await authFlowManager.start({
                    authClient,
                    flow,
                    scope: data.scope || '',
                    state: base64url(JSON.stringify({
                        flowId: flow._id,
                        payload: data.payload || {},
                    })),

                });

                res.send({
                    data: {
                        authUrl,
                    },
                });
            } catch (err) {
                log.error(err);
                next({
                    err,
                    status: 400,
                    message: err.message,
                });
            }
        });
    }
}

module.exports = AuthClientRouter;
