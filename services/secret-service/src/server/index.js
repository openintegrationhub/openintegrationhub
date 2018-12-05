const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const conf = require('../conf');

const swaggerDocument = YAML.load(path.join(__dirname, '/../../doc/openapi.yaml'));
const swaggerOptions = {
    // swaggerUrl: 'https://raw.githubusercontent.com/openintegrationhub/Architecture/master/SmartDataFramework/oih-sdf-api-0.0.2.json',
    enableCORS: false,
    explorer: true,
};

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

        this.app.use('/', require('./../route/root'));
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
        this.app.get('/healthcheck', (req, res) => {
            res.sendStatus(200);
        });

        const apiBase = express.Router();

        // setup routes
        apiBase.use('/secrets', require('./../route/secrets')); // eslint-disable-line global-require
        apiBase.use('/auth-clients', require('./../route/auth-clients')); // eslint-disable-line global-require
        apiBase.use('/audits', require('./../route/audits')); // eslint-disable-line global-require
        apiBase.use('/callback', require('./../route/callback')); // eslint-disable-line global-require
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
