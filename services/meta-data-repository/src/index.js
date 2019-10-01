const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const logger = require('@basaas/node-logger');

const { EventBus } = require('@openintegrationhub/event-bus');
const Server = require('./server');
const conf = require('./conf');

const log = logger.getLogger(`${conf.log.namespace}/main`);

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

const eventBus = new EventBus({ serviceName: conf.log.namespace, rabbitmqUri: process.env.RABBITMQ_URI });

const server = new Server({
    eventBus,
});

(async () => {
    try {
        await server.start();
        log.info(`Listening on port ${conf.port}`);
        log.info(`Introspect type ${conf.iam.introspectType}`);
    } catch (err) {
        exitHandler(null, err);
    }
})();
