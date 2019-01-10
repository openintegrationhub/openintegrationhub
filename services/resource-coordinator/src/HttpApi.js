const express = require('express');
const Lib = require('backend-commons-lib');
const { errors } = Lib;

class HttpApi {
    /**
     * @constructor
     * @param config
     * @param logger
     * @param flowsDao - Flow Data Access Object
     */
    constructor(config, logger, flowsDao) {
        this._config = config;
        this._logger = logger.child({service: 'HttpApi'});
        this._flowsDao = flowsDao;
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
        this._logger.trace(req.params, 'Node info request');
        try {
            const flow = await this._flowsDao.findById(req.params.flowId);
            if (!flow) {
                throw new errors.ResourceNotFoundError('Flow is not found');
            }
            const node = flow.getRecipeNodeByStepId(req.params.stepId);
            if (!node) {
                throw new errors.ResourceNotFoundError('Node is not found');
            }
            res.status(200);
            res.json({
                id: node.id,
                function: node.function,
                config: node.data || {}
            });
        } catch (e) {
            this._logger.error(e, req.params, 'Node info request failed');
            res.status(500);
            res.end(e.message);
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
