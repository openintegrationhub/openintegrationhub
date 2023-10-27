const express = require('express');

class HttpApi {
    /**
     * @constructor
     * @param opts.config
     * @param opts.logger
     */
    constructor({ config, logger, flowStateDao }) {
        this._config = config;
        this._logger = logger.child({ service: 'HttpApi' });
        this._app = express();

        this._app.get('/executions', async (req, res, next) => {
            try {
                res.json([]);
            } catch (e) {
                return next(e);
            }
        });

        this._app.get('/executions/:execId', async (req, res, next) => {
            try {
                const execution = await flowStateDao.findById(req.params.execId);

                if (!execution) {
                    return res.status(404).json({
                        error: 'Not found'
                    });
                }

                res.json(execution);
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

    _errorHandler(err, req, res, next) { //eslint-disable-line no-unused-vars
        this._logger.error(err, 'Node info request failed');
        return res.status(err.status || 500).json({
            error: err.message || 'Unknown error'
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
