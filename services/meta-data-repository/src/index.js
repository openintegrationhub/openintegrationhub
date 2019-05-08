const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const logger = require('@basaas/node-logger');

const Server = require('./server');
const conf = require('./conf');

const log = logger.getLogger(`${conf.logging.namespace}/main`);

function exitHandler(options, err) {
    let status = 0;
    if (err) {
        status = 1;
        log.error(`Error ${err}`);
    }
    log.info('Perform exit');
    process.exit(status);
}

process.on('SIGINT', exitHandler.bind(null));

const server = new Server({});

(async () => {
    try {
        await server.start();
        log.info(`Listening on port ${conf.port}`);
        log.info(`Introspect type ${conf.iam.introspectType}`);
    } catch (err) {
        exitHandler(null, err);
    }
})();
