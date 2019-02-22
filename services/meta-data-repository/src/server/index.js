const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const iamLib = require('@openintegrationhub/iam-utils');
const conf = require('../conf');

const jsonParser = bodyParser.json();

module.exports = class Server {
    constructor({ port, mongoDbConnection }) {
        this.port = port || conf.port;
        this.app = express();
        this.app.disable('x-powered-by');

        // setup database
        Server.setupDatabase(mongoDbConnection);

        // enable advanced stdout logging
        if (conf.debugMode) {
            this.app.use(morgan('combined'));
        }


        this.app.use(jsonParser);
        // base routes
        this.app.use('/', require('./../route/root'));
        this.app.use('/healthcheck', require('./../route/healtcheck'));

        const apiBase = express.Router();

        apiBase.use(iamLib.middleware);

        // setup routes
        apiBase.use('/domains', require('./../route/domains'));

        this.app.use(conf.apiBase, apiBase);

        // error middleware
        this.app.use(require('./../middleware/error').default);
    }

    static setupDatabase(mongoDbConnection) {
        const connectionString = mongoDbConnection
        || global.__MONGO_URI__
        || conf.mongoDbConnection;

        mongoose.connect(connectionString, {
            poolSize: 50,
            socketTimeoutMS: 60000,
            connectTimeoutMS: 30000,
            keepAlive: 120,
            useCreateIndex: true,
            useNewUrlParser: true,
        });
    }

    async start() {
        this.server = await this.app.listen(this.port);
    }

    async stop() {
        if (this.server) {
            mongoose.connection.close();
            this.server.close();
        }
    }
};
