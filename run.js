const logger = require('./lib/logging.js');
const Sailor = require('./lib/sailor.js').Sailor;
const settings = require('./lib/settings.js').readFrom(process.env);
const co = require('co');

exports.disconnect = disconnect;

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
        yield sailor.shutdown();
        return;
    }

    disconnectRequired = true;
    yield sailor.connect();
    yield sailor.prepare();

    //eslint-disable-next-line no-extra-boolean-cast
    if (!!settings.STARTUP_REQUIRED) {
        yield sailor.startup();
    }

    yield sailor.init();
    yield sailor.run();
}).catch((e) => {
    if (sailor) {
        sailor.reportError(e);
    }
    logger.criticalErrorAndExit(e);
});

process.on('SIGTERM', function onSigterm() {
    logger.info('Received SIGTERM');
    disconnectAndExit();
});

process.on('SIGINT', function onSigint() {
    logger.info('Received SIGINT');
    disconnectAndExit();
});

process.on('uncaughtException', logger.criticalErrorAndExit);

function disconnect() {
    return co(function* putIn() {
        logger.info('Disconnecting...');
        return yield sailor.disconnect();
    });
}

function disconnectAndExit() {
    if (!disconnectRequired) {
        return;
    }
    co(function* putIn() {
        yield disconnect();
        logger.info('Successfully disconnected');
        process.exit();
    }).catch((err) => {
        logger.error('Unable to disconnect', err.stack);
        process.exit(-1);
    });
}
