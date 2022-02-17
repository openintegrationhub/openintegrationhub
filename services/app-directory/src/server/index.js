const express = require('express');
const { EventBus, EventBusManager } = require('@openintegrationhub/event-bus');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const bodyParser = require('body-parser');
const iamLib = require('@openintegrationhub/iam-utils');
const conf = require('../conf');
const EventsModule = require('../module/event');

const { originWhitelist } = conf;

const swaggerDocument = require('../../doc/openapi.json');

const swaggerOptions = {
    enableCORS: false,
    explorer: true,
};
const jsonParser = bodyParser.json();

module.exports = class Server {
    constructor({ port, mongoDbConnection }) {
        this.port = port || conf.port;
        this.mongoDbConnection = mongoDbConnection;
        this.eventBus = new EventBus({ serviceName: conf.logging.namespace, rabbitmqUri: process.env.RABBITMQ_URI });
        this.app = express();
        this.app.disable('x-powered-by');

        this.setupCors();

        // enable advanced stdout logging
        if (conf.debugMode) {
            this.app.use(morgan('combined'));
        }

        this.app.use(jsonParser);

        this.app.use('/', require('../route/root'));
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
        this.app.get('/healthcheck', (req, res) => {
            res.sendStatus(200);
        });

        const apiBase = express.Router();

        apiBase.use(iamLib.middleware);

        // setup routes
        apiBase.use('/apps', require('../route/apps')); // eslint-disable-line global-require

        this.app.use(conf.apiBase, cors(this.corsOptions), apiBase);
        // this.app.use(conf.apiBase, apiBase);

        // error middleware
        this.app.use(require('../middleware/error').default);
    }

    async setupDatabase() {
        const connectionString = this.mongoDbConnection
        || global.__MONGO_URI__
        || conf.mongoDbConnection;

        await mongoose.connect(connectionString, {
            maxPoolSize: conf.mongoDbPoolSize,
            socketTimeoutMS: 60000,
            connectTimeoutMS: 30000,
            keepAliveInitialDelay: 300000,
        });
    }

    setupCors() {
        this.corsOptions = {
            credentials: true,
            origin(origin, callback) {
                if (originWhitelist.find((elem) => origin.indexOf(elem) >= 0)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
        };

        this.app.use((req, res, next) => {
            req.headers.origin = req.headers.origin || req.headers.host;
            next();
        });
    }

    async start() {
        await this.setupDatabase();
        this.server = await this.app.listen(this.port);
        EventBusManager.init({ eventBus: this.eventBus, serviceName: conf.loggingNameSpace });
        this.eventsModule = new EventsModule();
    }

    async stop() {
        if (this.server) {
            await mongoose.connection.close();
            this.server.close();
            await EventBusManager.destroy();
        }
    }
};
