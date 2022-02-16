/* eslint max-len: "off" */

const express = require('express');

const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const config = require('./config/index');
const chunk = require('./api/controllers/chunk');

const swaggerDocument = require('./api/swagger/swagger.json');

const log = require('./config/logger');

class Server {
  constructor() {
    this.app = express();
    this.app.disable('x-powered-by');
    this.app.use(cors());
    this.app.options('*', cors());
  }

  setupRoutes() {
    log.info('Setting up routes...');
    this.app.use('/chunks', chunk);
    this.app.use('/docs', (req, res) => {
      res.redirect('/api-docs');
    });

    this.app.get('/healthcheck', (req, res) => {
      // TODO: Improve healthcheck
      res.status(200).send('OK');
    });

    log.info('Routes set ...');
  }

  async setup(mongoose) {
    log.info('Connecting to MongoDB ...');
    // Use the container_name, because containers in the same network can communicate using their service name

    this.mongoose = mongoose;

    const options = {
      keepAlive: 1,
      connectTimeoutMS: 30000,
      reconnectInterval: 1000,
      reconnectTries: Number.MAX_VALUE,
    };

    // Will connect to the mongo container by default, but to localhost if testing is active
    mongoose.connect(config.mongoUrl, options);

    // Get Mongoose to use the global promise library
    mongoose.Promise = global.Promise;  // eslint-disable-line
    // Get the default connection
    this.db = mongoose.connection;
    // Bind connection to error event (to get notification of connection errors)
    this.db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    log.info('Connection done.');
  }

  setupSwagger() {
    log.info('Setting up Swagger ...');
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }));
    this.app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }));
  }

  listen(port) {
    const cport = typeof port !== 'undefined' ? port : 3003;
    log.info(`Server is running on ${cport}`);
    return this.app.listen(cport);
  }
}

module.exports = Server;
