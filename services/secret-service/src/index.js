require('dotenv').config();

const logger = require('@basaas/node-logger');

const Server = require('./server');
const conf = require('./conf');

const log = logger.getLogger(`${conf.logging.namespace}/main`);

process.title = `node ${require('./../package.json').name} ${require('./../package.json').version}`;

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
        // encryption tenant key
        key: require('./adapter/key'),
        // auth flow manager
        externalId: {
            slack: require('./adapter/external-id/slack'),
            jira: require('./adapter/external-id/jira'),
        },
    },
});

// if (process.env.ALLOW_SELF_SIGNED) {
//     process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
// }

(async () => {
    try {
        await server.start();
        log.debug('-- DEBUG LOG --');
        log.info(`Listening on port ${conf.port}`);
        log.info(`Introspect type ${conf.iam.introspectType}`);
    } catch (err) {
        exitHandler(null, err);
    }
})();
