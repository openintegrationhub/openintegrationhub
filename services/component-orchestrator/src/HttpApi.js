const express = require('express');

class HttpApi {
    /**
     * @constructor
     * @param opts
     * @param opts.config
     * @param opts.logger
     */
    constructor({ config, logger, flowStateDao }) {
        this._config = config;
        this._logger = logger.child({ service: 'HttpApi' });
        this._app = express();

        this._app.get('/executions', async (req, res, next) => {
            const { filter } = req.query;
            try {
                const query = {};

                if (!filter || !filter.flowId) {
                    return res.status(400).json({ error: 'filter[flowId] is required.' });
                }

                if (filter && filter.flowId) {
                    query.flowId = filter.flowId;
                }

                const executions = await flowStateDao.find(query).limit(100);
                res.json({ data: executions });
            } catch (e) {
                return next(e);
            }
        });

        this._app.get('/executions/:execId', async (req, res, next) => {
            try {
                const execution = await flowStateDao.findByFlowExecId(req.params.execId);

                if (!execution) {
                    return res.status(404).json({
                        error: 'Execution not found',
                    });
                }

                res.json({ data: execution });
            } catch (e) {
                return next(e);
            }
        });

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

    //eslint-disable-next-line no-unused-vars
    _errorHandler(err, req, res, next) {
        this._logger.error(err, 'Node info request failed');
        return res.status(err.status || 500).json({
            error: err.message || 'Unknown error',
        });
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
