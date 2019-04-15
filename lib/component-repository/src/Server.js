const express = require('express');
const mongoose = require('mongoose');
const { formatAndRespond, errorHandler } = require('./middleware');


class Server {
    constructor({config, logger}) {
        this._config = config;
        this._logger = logger;

        const app = express();
        app.use('/components', require('./routes/components'));
        app.use(formatAndRespond());
        app.use(errorHandler());

        this._app = app;
    }

    async start() {
        await mongoose.connect('mongodb://localhost/test', {useNewUrlParser: true});
        const server = await this._app.listen(this._config.get('PORT'));
        this._logger.info(`Listening on port ${server.address().port}`);
        return server;
    }

    async stop() {}
}

module.exports = Server;
