// const conf = require('config');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const log = require('./config/logger');

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

    if (!module.parent) {
      mainServer.listen(process.env.PORT || 3001);
    } else {
      mainServer.listen();
    }
  } catch (err) {
    log.error(err);
  }
})();

module.exports = mainServer;
