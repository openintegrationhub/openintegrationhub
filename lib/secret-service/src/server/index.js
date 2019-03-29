const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const iamLib = require('./../modules/iam');
const conf = require('../conf');
const AuthClientRouter = require('./../route/auth-clients');
const SecretsRouter = require('./../route/secrets');

const jsonParser = bodyParser.json();

module.exports = class Server {
    constructor({ port, mongoDbConnection, adapter, iam }) {
        this.port = port || conf.port;
        this.app = express();
        this.app.disable('x-powered-by');

        this.iam = iam || iamLib;

        // setup database
        Server.setupDatabase(mongoDbConnection);

        // enable advanced stdout logging
        if (conf.debugMode) {
            this.app.use(morgan('combined'));
        }

        this.setupAdapter(adapter || {});

        this.app.use(jsonParser);

        this.app.use('/', require('./../route/root'));
        this.app.get('/healthcheck', (req, res) => {
            res.sendStatus(200);
        });

        const apiBase = express.Router();

        apiBase.use('/callback', require('./../route/callback'));
        apiBase.use(this.iam.middleware);
        // setup routes
        apiBase.use('/secrets', new SecretsRouter({ iam: this.iam }));
        apiBase.use('/auth-clients', new AuthClientRouter({ iam: this.iam }));

        this.app.use(conf.apiBase, apiBase);

        // error middleware
        this.app.use(require('./../middleware/error').default);
    }

    setupAdapter({ key, externalId }) {
        this.app.locals.middleware = {
            key: key || require('../adapter/key'),
            externalId: externalId || {},
        };
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
