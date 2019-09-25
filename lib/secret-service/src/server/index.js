const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const { EventBusManager } = require('@openintegrationhub/event-bus');
const swaggerDocument = require('../../doc/openapi');
const iamLib = require('./../modules/iam');

const EventsModule = require('./../modules/event');
const { validateIAM } = require('./../util/validateIModules');
const conf = require('../conf');
const AuthClientRouter = require('./../route/auth-clients');
const SecretsRouter = require('./../route/secrets');

const jsonParser = bodyParser.json();

module.exports = class Server {
    constructor({
        port, mongoDbConnection, adapter, iam, eventBus,
    }) {
        this.port = port || conf.port;
        this.app = express();
        this.app.disable('x-powered-by');

        this.iam = (iam && validateIAM(iam)) || iamLib;
        EventBusManager.init({ eventBus, serviceName: conf.name });

        this.eventsModule = new EventsModule();
        this.mongoConnection = mongoDbConnection;

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
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: false }));

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

    setupAdapter({ key, preprocessor }) {
        this.app.locals.middleware = {
            key: key || require('../adapter/key/global'),
            preprocessor: preprocessor || {},
        };
    }

    async setupDatabase(mongoDbConnection) {
        const connectionString = mongoDbConnection
        || global.__MONGO_URI__
        || conf.mongoDbConnection;

        await mongoose.connect(connectionString, {
            poolSize: 50,
            socketTimeoutMS: 60000,
            connectTimeoutMS: 30000,
            keepAlive: 120,
            useCreateIndex: true,
            useNewUrlParser: true,
            useFindAndModify: false,
            useUnifiedTopology: true,
        });
    }

    async start() {
        await this.setupDatabase(this.mongoConnection);
        this.server = await this.app.listen(this.port);
    }

    async stop() {
        if (this.server) {
            mongoose.connection.close();
            this.server.close();
            await EventBusManager.destroy();
        }
    }
};
