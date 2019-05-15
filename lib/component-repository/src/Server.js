const express = require('express');
const mongoose = require('mongoose');
const { formatAndRespond, errorHandler, setReqLogger } = require('./middleware');
const defaultIam = require('@openintegrationhub/iam-utils');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../docs/swagger/openapi.json');

class Server {
    constructor({config, logger, iam = defaultIam}) {
        this._config = config;
        this._logger = logger;

        const app = express();
        app.use(setReqLogger(logger));
        app.get('/', (req, res) => res.send('Component Repository'));
        app.use('/healthcheck', require('./routes/healthcheck'));
        app.use('/components', require('./routes/components')({iam}));
        app.use(formatAndRespond());
        app.use(errorHandler());
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }));

        this._app = app;
    }

    async start() {
        await mongoose.connect(this._config.get('MONGODB_URI'), {useNewUrlParser: true});
        const server = await this._app.listen(this._config.get('PORT'));
        this._logger.info(`Listening on port ${server.address().port}`);
        this._server = server;
        return server;
    }

    async stop() {
        await mongoose.disconnect();
        this._logger.info('MongoDB disconnected');
        this._server.close();
        this._logger.info('Server closed');
    }

    getApp() {
        return this._app;
    }
}

module.exports = Server;
