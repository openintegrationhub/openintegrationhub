const express = require('express');
const mongoose = require('mongoose');
const { formatAndRespond, errorHandler, setReqLogger, setReqEventBus, setReqEvent, setCors } = require('./middleware');
const defaultIam = require('@openintegrationhub/iam-utils');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../docs/swagger/openapi.json');
const EventSubscription = require('./EventSubscription');

class Server {
    constructor({config, logger, iam = defaultIam, eventBus, eventClass}) {
        this._config = config;
        this._logger = logger;
        this._eventBus = eventBus;

        const app = express();

        const whitelist = this.getCorsWhitelist();
        this._logger.info({whitelist}, 'CORS whitelist');

        app.use(setReqLogger(logger));
        app.use(setReqEventBus(eventBus));
        app.use(setReqEvent(eventClass));

        app.get('/', (req, res) => res.send('Component Repository'));
        app.use('/healthcheck', require('./routes/healthcheck'));
        app.use('/components', setCors({whitelist, logger}), require('./routes/components')({iam, eventBus, logger }));
        app.use(formatAndRespond());
        app.use(errorHandler());
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }));

        this._app = app;
    }

    async start() {
        const mongooseOptions = {
            socketTimeoutMS: 60000,
        };
        await mongoose.connect(this._config.get('MONGODB_URI'), mongooseOptions);
        await this._subscribeToEvents();
        const server = await this._app.listen(this._config.get('PORT'));
        this._logger.info(`Listening on port ${server.address().port}`);
        this._server = server;
        return server;
    }

    async stop() {
        await mongoose.disconnect();
        await this._eventBus.disconnect();
        this._logger.info('MongoDB disconnected');
        this._server.close();
        this._logger.info('Server closed');
    }

    getApp() {
        return this._app;
    }

    getCorsWhitelist() {
        const wl = this._config.get('CORS_ORIGIN_WHITELIST') || '';
        return wl ? wl.split(',') : [];
    }

    async _subscribeToEvents() {
        const eventSubscription = new EventSubscription({
            eventBus: this._eventBus,
            logger: this._logger
        });
        await eventSubscription.subscribe();
        this._logger.info('Subscribed to events');
    }
}

module.exports = Server;
