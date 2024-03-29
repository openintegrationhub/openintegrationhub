// const conf = require('config');
const mongoose = require('mongoose');
const log = require('./config/logger');

const Server = require('./server');

const mainServer = new Server();

(async () => {
    try {
        if (!module.parent) {
            await mainServer.setup(mongoose);
        }
        mainServer.startListening();

        mainServer.setupMiddleware();
        mainServer.setupRoutes();
        mainServer.setupSwagger();

        if (!module.parent) {
            mainServer.listen(process.env.PORT || 3007);
        } else {
            mainServer.listen();
        }
    } catch (err) {
        log.error(err);
    }
})();

module.exports = mainServer;
