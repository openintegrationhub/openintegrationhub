const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const logger = require('@basaas/node-logger');

const { EventBus } = require('@openintegrationhub/event-bus');
const Server = require('./src/server');
const conf = require('./src/conf');

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

(async () => {
    try {
        // configuring the EventBus
        const eventBus = new EventBus({
            serviceName: conf.name,
            rabbitmqUri: process.env.RABBITMQ_URI,
        });

        const server = new Server({
            adapter: {
                key: require('./src/adapter/key/global'),
                preprocessor: {
                    microsoft: require('./src/adapter/preprocessor/microsoft'),
                    oidc: require('./src/adapter/preprocessor/oidc'),
                    azure: require('./src/adapter/preprocessor/azure'),
                    zoom: require('./src/adapter/preprocessor/zoom'),
                },
            },
            eventBus,
        });

        await server.start();
        log.info(`Listening on port ${conf.port}`);
        log.info(`Introspect type ${conf.iam.introspectType}`);
    } catch (err) {
        exitHandler(null, err);
    }
})();
