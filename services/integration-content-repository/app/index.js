// const conf = require('config');
const mongoose = require('mongoose');
const log = require('./config/logger');
// const iamMiddleware = require('./iam-utils/index');

const Server = require('./server');

const mainServer = new Server();

(async () => {
  try {
    await mainServer.setup(mongoose);
    mainServer.setupRoutes();
    mainServer.setupSwagger();

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
