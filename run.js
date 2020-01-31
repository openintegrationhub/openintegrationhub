const logger = require('./lib/logging.js');
const Sailor = require('./lib/sailor.js').Sailor;
const settings = require('./lib/settings.js').readFrom(process.env);
const co = require('co');

let sailor;
let disconnectRequired;

co(function* putOutToSea() {
    sailor = new Sailor(settings);

    //eslint-disable-next-line no-extra-boolean-cast
    if (!!settings.HOOK_SHUTDOWN) {
        disconnectRequired = false;
        //eslint-disable-next-line no-empty-function
        sailor.reportError = () => {
        };
        yield sailor.prepare();
        yield sailor.runHookShutdown();
        return;
    }

    disconnectRequired = true;
    yield sailor.connect();
    yield sailor.prepare();

    //eslint-disable-next-line no-extra-boolean-cast
    if (!!settings.STARTUP_REQUIRED) {
        yield sailor.startup();
    }

    yield sailor.runHookInit();
    yield sailor.run();
}).catch((e) => {
    if (sailor) {
        sailor.reportError(e);
    }
    logger.criticalErrorAndExit('putOutToSea.catch', e);
});

process.on('SIGTERM', function onSigterm() {
    logger.info('Received SIGTERM');
    gracefulShutdown();
});

process.on('SIGINT', function onSigint() {
    logger.info('Received SIGINT');
    gracefulShutdown();
});

process.on('uncaughtException', logger.criticalErrorAndExit.bind(logger, 'process.uncaughtException'));

function disconnectAndExit() {
    if (!disconnectRequired) {
        return;
    }
    disconnectRequired = false;
    co(function* putIn() {
        logger.info('Disconnecting...');
        yield sailor.disconnect();
        logger.info('Successfully disconnected');
        process.exit();
    }).catch((err) => {
        logger.error('Unable to disconnect', err.stack);
        process.exit(-1);
    });
}

function _disconnectOnly() {
    if (!disconnectRequired) {
        return Promise.resolve();
    }
    return sailor.disconnect();
}

function gracefulShutdown() {
    if (!disconnectRequired) {
        return;
    }

    if (!sailor) {
        logger.warn('Something went wrong – sailor is falsy');
        return;
    }

    sailor.scheduleShutdown().then(disconnectAndExit);
}

exports._disconnectOnly = _disconnectOnly;
