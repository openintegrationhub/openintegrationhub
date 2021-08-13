// const conf = require('config');
const mongoose = require('mongoose');
const log = require('./config/logger');
const storedFunctionCache = require('./config/storedFunctionCache');

const Server = require('./server');

const mainServer = new Server();

(async () => {
  try {
    if (!module.parent) {
      await mainServer.setup(mongoose);
    }
    mainServer.setupCors();
    mainServer.setupMiddleware();
    mainServer.setupRoutes();
    mainServer.setupSwagger();
    mainServer.setupQueue();

    storedFunctionCache.loadAll();

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
