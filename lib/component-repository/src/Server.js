const express = require('express');
const mongoose = require('mongoose');
const { formatAndRespond, errorHandler, setReqLogger } = require('./middleware');
const defaultIam = require('@openintegrationhub/iam-utils');

class Server {
    constructor({config, logger, iam = defaultIam}) {
        this._config = config;
        this._logger = logger;

        const app = express();
        app.use(setReqLogger(logger));
        app.use('/healthcheck', require('./routes/healthcheck'));
        app.use('/components', require('./routes/components')({iam}));
        app.use(formatAndRespond());
        app.use(errorHandler());

        this._app = app;
    }

    async start() {
        await mongoose.connect(this._config.get('MONGODB_URI'), {useNewUrlParser: true});
        const server = await this._app.listen(this._config.get('PORT'));
        this._logger.info(`Listening on port ${server.address().port}`);
        return server;
    }

    async stop() {}
}

module.exports = Server;
