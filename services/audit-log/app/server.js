/* eslint no-unused-expressions: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint max-len: "off" */
/* eslint consistent-return: "off" */
/* eslint class-methods-use-this: "off" */

const express = require('express');

const swaggerUi = require('swagger-ui-express');
const iamMiddleware = require('@openintegrationhub/iam-utils');
const cors = require('cors');
const config = require('./config/index');
const logs = require('./api/controllers/log');
const push = require('./api/controllers/push');
const healthcheck = require('./api/controllers/healthcheck');
const swaggerDocument = require('./api/swagger/swagger.json');

const log = require('./config/logger');

// const receiver = require('./api/utils/receive.module.js');
const eventBus = require('./api/utils/eventBus');

class Server {
    constructor() {
        this.app = express();
        this.app.disable('x-powered-by');
        this.app.use(cors());
        this.app.options('*', cors());
        global.queueHealth = false;
    }

    setupMiddleware() {
        log.info('Setting up middleware...');

        this.app.use('/logs', iamMiddleware.middleware);
        this.app.use('/logs', async (req, res, next) => {
            if (this.mongoose.connection.readyState !== 1) {
                return res.status(500).send({ errors: [{ message: `NO DB. Please try again later ${this.mongoose.connection.readyState}`, code: 500 }] });
            }
            next();
        });
        log.info('Middleware set up');
    }

    setupRoutes() {
        log.info('Setting routes...');

        // configure routes
        this.app.use('/logs', logs);
        this.app.use('/logs', push);

        this.app.use('/healthcheck', healthcheck);

        // Reroute to docs
        this.app.use('/docs', (req, res) => {
            res.redirect('/api-docs');
        });

        // Error handling
      this.app.use(function (err, req, res, next) { // eslint-disable-line
            return res.status(err.status || 500).send({ errors: [{ message: err.message, code: err.status }] });
        });

        log.info('Routes set');
    }

    async setup(mongoose) {
        log.info('Connecting to MongoDB...');
        // Configure MongoDB
        // Use the container_name, bec containers in the same network can communicate using their service name
        try {
            this.mongoose = mongoose;

            const options = {
                keepAliveInitialDelay: 300000, connectTimeoutMS: 30000,
            }; //

            // Will connect to the mongo container by default, but to localhost if testing is active
            await mongoose.connect(config.mongoUrl, options);

            // Get the default connection
            this.db = mongoose.connection;
            // Bind connection to error event (to get notification of connection errors)
            this.db.on('error', console.error.bind(console, 'MongoDB connection error:'));
            log.info('Successfully connected to MongoDB');
        } catch (e) {
            log.error(e);
        }
    }

    startListening() {
        log.info('Establishing connection to queue...');

        try {
            // receiver.connect();
            eventBus.connectQueue();
        } catch (error) {
            log.error(error);
        }
        global.queueHealth = true;
        log.info('Connected to queue');
    }

    setupSwagger() {
        log.info('Generating Swagger documentation');
        // Configure the Swagger-API
        /*eslint-disable */
        var config = {
          appRoot: __dirname, // required config

          // This is just here to stop Swagger from complaining, without actual functionality

          swaggerSecurityHandlers: {
            Bearer: function (req, authOrSecDef, scopesOrApiKey, cb) {
              if (true) {
                cb();
              } else {
                cb(new Error('access denied!'));
              }
            }
          }
        };
        /* eslint-enable */

        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }));
    }

    listen(port) {
        const cport = typeof port !== 'undefined' ? port : 3007;
        log.info(`Opening port ${cport}`);
        return this.app.listen(cport);
    }
}

module.exports = Server;
