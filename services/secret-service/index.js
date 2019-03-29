const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const logger = require('@basaas/node-logger');

const Server = require('@openintegrationhub/secret-service');
const conf = require('./src/conf');

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

const server = new Server({
    adapter: {
        key: require('@openintegrationhub/secret-service/src/adapter/key'),
    },
});

// if (process.env.ALLOW_SELF_SIGNED) {
//     process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
// }

(async () => {
    try {
        await server.start();
        log.info(`Listening on port ${conf.port}`);
        log.info(`Introspect type ${conf.iam.introspectType}`);
    } catch (err) {
        exitHandler(null, err);
    }
})();
