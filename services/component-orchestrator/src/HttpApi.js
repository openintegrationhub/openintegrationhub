const express = require('express');
const Lib = require('backend-commons-lib');
const { errors } = Lib;
const auth = require('basic-auth');

class HttpApi {
    /**
     * @constructor
     * @param opts.config
     * @param opts.logger
     * @param opts.flowsDao - Flow Data Access Object
     * @param opts.secretsDao - Secrets Data Access Object
     * @param opts.snapshotsDao - Snapshots Data Access Object
     */
    constructor({ config, logger, flowsDao, secretsDao, snapshotsDao, componentOrchestrator }) {
        this._config = config;
        this._logger = logger.child({ service: 'HttpApi' });
        this._componentOrchestrator = componentOrchestrator
        this._flowsDao = flowsDao;
        this._secretsDao = secretsDao;
        this._snapshotsDao = snapshotsDao;
        this._app = express();
        this._app.get('/v1/tasks/:flowId/steps/:stepId', this._setIamToken.bind(this), this._getStepInfo.bind(this));
        this._app.get('/v1/components/:componentId/start', this._setIamToken.bind(this), this._getStepInfo.bind(this));
        this._app.get('/v1/components/:componentId/stop', this._setIamToken.bind(this), this._getStepInfo.bind(this));
        this._app.get('/healthcheck', this._healthcheck.bind(this));
        this._app.use(this._errorHandler.bind(this));
    }

    getApp() {
        return this._app;
    }

    /**
     * Start listening for incoming traffic on a port.
     * @param listenPort
     */
    listen(listenPort) {
        this._logger.info({ port: listenPort }, 'Going to listen for http');
        this._app.listen(listenPort);
    }

    _errorHandler(err, req, res, next) { //eslint-disable-line no-unused-vars
        this._logger.error(err, 'Node info request failed');
        return res.status(err.status || 500).json({
            error: err.message || 'Unknown error'
        });
    }

    _setIamToken(req, res, next) {
        // Ferryman passes an IAM token as a password part of the Basic auth header
        const user = auth(req);
        if (!user) {
            return next(new Error('Failed to parse basic auth'));
        }
        req.iamToken = user.pass;
        return next();
    }

    /**
     * This API is required by flow nodes in order to get a node's configuration.
     * @param req
     * @param res
     * @returns {Promise<void>}
     * @private
     */
    async _getStepInfo(req, res, next) {
        const { flowId, stepId } = req.params;
        const logger = this._logger.child({ flowId, stepId });

        try {
            const flow = await this._flowsDao.findById(flowId);
            if (!flow) {
                throw new errors.ResourceNotFoundError('Flow is not found');
            }
            const node = await flow.getNodeById(stepId);
            if (!node) {
                throw new errors.ResourceNotFoundError('Node is not found');
            }

            const nodeConfig = node.fields || {};
            if (node.credentials_id) {
                logger.trace({ secretId: node.credentials_id }, 'About to get secret by ID');
                const secret = await this._secretsDao.findById(node.credentials_id, {
                    auth: {
                        token: req.iamToken
                    }
                });
                if (!secret) {
                    throw new errors.ResourceNotFoundError(`Secret ${node.credentials_id} is not found`);
                }
                Object.assign(nodeConfig, secret.value);
                logger.trace({ nodeConfig }, 'Got secret. Injected into the node config.');
            }

            let snapshot = {};

            try {
                snapshot = await this._snapshotsDao.findOne({
                    flowId,
                    stepId,
                    auth: { token: req.iamToken }
                });
            } catch (e) {
                logger.warn(e, 'Failed to get snapshot');
            }

            res.status(200);
            res.json({
                id: node.id,
                function: node.function,
                config: nodeConfig,
                snapshot
            });
        } catch (e) {
            return next(e);
        }
    }

    /**
     * Healthcheck endpoint.
     * @param req
     * @param res
     * @returns {Promise<void>}
     * @private
     */
    async _healthcheck(req, res) {
        this._logger.trace('Healthcheck request');
        res.status(200).end();
    }
}

module.exports = HttpApi;
