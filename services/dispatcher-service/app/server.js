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
const healthcheck = require('./api/controllers/healthcheck');
const swaggerDocument = require('./api/swagger/swagger.json');
const dispatches = require('./api/controllers/dispatches');

const log = require('./utils/logger');

const eventBus = require('./utils/eventBus');

class Server {
  constructor() {
    this.app = express();
    this.app.disable('x-powered-by');
    this.app.use(cors({
      origin: true,
      credentials: true,
    }));
    this.app.options('*', cors());
    global.queueHealth = false;
  }

  setupMiddleware() {
    log.info('Setting up middleware...');

    this.app.use('/dispatches', iamMiddleware.middleware);

    log.info('Middleware set up');
  }

  setupRoutes() {
    log.info('Setting routes...');

    // configure routes
    this.app.use('/healthcheck', healthcheck);
    this.app.use('/dispatches', dispatches);

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
        keepAliveInitialDelay: 300000, connectTimeoutMS: 30000, reconnectInterval: 1000, reconnectTries: Number.MAX_VALUE,
      };

      // Will connect to the mongo container by default, but to localhost if testing is active
      await mongoose.connect(config.mongoUrl, options);

      // Get Mongoose to use the global promise library
      mongoose.Promise = global.Promise;  // eslint-disable-line
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
    const cport = typeof port !== 'undefined' ? port : 3013;
    log.info(`Opening port ${cport}`);
    return this.app.listen(cport);
  }
}

module.exports = Server;
