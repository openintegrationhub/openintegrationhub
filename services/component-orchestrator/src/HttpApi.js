const express = require('express');
const Lib = require('backend-commons-lib');
const { errors } = Lib;

class HttpApi {
    /**
     * @constructor
     * @param opts.config
     * @param opts.logger
     * @param opts.flowsDao - Flow Data Access Object
     * @param opts.secretsDao - Secrets Data Access Object
     */
    constructor({ config, logger, flowsDao, secretsDao }) {
        this._config = config;
        this._logger = logger.child({service: 'HttpApi'});
        this._flowsDao = flowsDao;
        this._secretsDao = secretsDao;
        this._app = express();
        this._app.get('/v1/tasks/:flowId/steps/:stepId', this._getStepInfo.bind(this));
        this._app.get('/healthcheck', this._healthcheck.bind(this));
    }

    /**
     * Start listening for incoming traffic on a port.
     * @param listenPort
     */
    listen(listenPort) {
        this._logger.info({port: listenPort}, 'Going to listen for http');
        this._app.listen(listenPort);
    }

    /**
     * This API is required by flow nodes in order to get a node's configuration.
     * @param req
     * @param res
     * @returns {Promise<void>}
     * @private
     */
    async _getStepInfo(req, res) {
        this._logger.trace({
            params: req.params,
            query: req.query,
            headers: req.headers,
            originalUrl: req.originalUrl
        }, 'Node info request');

        try {
            const flow = await this._flowsDao.findById(req.params.flowId);
            if (!flow) {
                throw new errors.ResourceNotFoundError('Flow is not found');
            }
            const node = await flow.getNodeById(req.params.stepId);
            if (!node) {
                throw new errors.ResourceNotFoundError('Node is not found');
            }

            const nodeConfig = node.fields || {};
            if (node.credentials_id) {
                this._logger.trace({secretId: node.credentials_id}, 'About to get secret by ID');
                const secret = await this._secretsDao.findById(node.credentials_id);
                if (!secret) {
                    throw new errors.ResourceNotFoundError(`Secret ${node.credentials_id} is not found`);
                }
                Object.assign(nodeConfig, secret.value);
            }

            res.status(200);
            res.json({
                id: node.id,
                function: node.function,
                config: nodeConfig
            });
        } catch (e) {
            this._logger.error(e, req.params, 'Node info request failed');
            res.status(500);
            res.json({error: e.message});
            return;
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
