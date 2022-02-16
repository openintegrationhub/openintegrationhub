const express = require('express');
const { EventBus, EventBusManager } = require('@openintegrationhub/event-bus');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const logger = require('@basaas/node-logger');
const swaggerDocument = require('../../doc/openapi');

const { isLocalRequest } = require('../util/common');

const iamLib = require('./../module/iam');
const EventsModule = require('./../module/event');
const DAO = require('../dao');
const conf = require('../conf');

const log = logger.getLogger(`${conf.log.namespace}/server`);


const jsonParser = bodyParser.json();

async function createCollections() {
    for (const key of Object.keys(DAO)) {
        try {
            await DAO[key].createCollection();
        } catch (err) {

        }
    }
}

module.exports = class Server {
    constructor({
        port, mongoDbConnection, dao, iam,
    }) {
        this.port = port || conf.port;
        this.eventBus = new EventBus({ serviceName: conf.log.namespace, rabbitmqUri: process.env.RABBITMQ_URI });
        this.app = express();
        this.app.disable('x-powered-by');
        this.iam = iam || iamLib;
        this.mongoDbConnection = mongoDbConnection;
        this.setupCors();
        // apply adapter
        // dao
        if (dao) {
            for (const key of Object.keys(dao)) {
                DAO[key] = dao[key];
            }
        }

        // enable advanced stdout logging
        if (conf.debugMode) {
            this.app.use(morgan('combined'));
        }

        this.app.use(jsonParser);

        // base routes
        this.app.use('/', require('./../route/root'));
        this.app.use('/healthcheck', require('./../route/healtcheck'));
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: false }));


        const apiBase = express.Router();
        apiBase.use('/domains', cors(this.corsOptions));

        apiBase.use((req, res, next) => {
            if (isLocalRequest(req)) {
                return next();
            }
            this.iam.middleware(req, res, next);
        });

        // setup routes
        apiBase.use('/domains', require('./../route/domains'));

        this.app.use(conf.apiBase, apiBase);

        // error middleware
        this.app.use(require('./../middleware/error').default);
    }

    setupCors() {
        this.corsOptions = {
            credentials: true,
            origin(origin, callback) {
                const whiteList = [...conf.originWhitelist].concat([conf.baseUrl.replace(/^https?:\/\//, '')]);
                if (whiteList.find((elem) => origin.indexOf(elem) >= 0)) {
                    callback(null, true);
                } else {
                    log.info({
                        message: 'Blocked by CORS',
                        origin,
                        originWhitelist: whiteList,
                    });
                    callback(new Error('Not allowed by CORS'));
                }
            },
        };

        this.app.use((req, res, next) => {
            req.headers.origin = req.headers.origin || req.headers.host;
            next();
        });
    }

    async setupDatabase() {
        const connectionString = this.mongoDbConnection
            || global.__MONGO_URI__
            || conf.mongoDbConnection;

        await mongoose.connect(connectionString, {
            poolSize: 50,
            socketTimeoutMS: 60000,
            connectTimeoutMS: 30000,
            keepAlive: 120,
        });
    }

    async start() {
        // setup database

        await this.setupDatabase();
        await createCollections();
        EventBusManager.init({ eventBus: this.eventBus, serviceName: conf.loggingNameSpace });
        this.eventsModule = new EventsModule();
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
