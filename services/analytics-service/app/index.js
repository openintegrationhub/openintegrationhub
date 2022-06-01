// const conf = require('config');
const mongoose = require('mongoose');
const log = require('./config/logger');

const Server = require('./server');

const Cronjob = require('./utils/cronjobs');

Cronjob.createCronJobs();

const mainServer = new Server();

(async () => {
  try {
    if (!module.parent) {
      await mainServer.setup(mongoose);
    }
    mainServer.setupCors();
    // mainServer.setupMiddleware();
    mainServer.setupRoutes();
    mainServer.setupSwagger();
    mainServer.setupQueue();

    if (!module.parent) {
      mainServer.listen(process.env.PORT || 3009);
    } else {
      mainServer.listen();
    }
  } catch (err) {
    log.error(err);
  }
})();

module.exports = mainServer;
