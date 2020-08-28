/* eslint no-underscore-dangle: 0 */ // --> OFF

const co = require('co');
const logger = require('./lib/logging.js');
const { Sailor } = require('./lib/sailor.js');
const settings = require('./lib/settings.js');

let sailor;
let disconnectRequired;

async function putOutToSea(localSettings) {
    sailor = new Sailor(localSettings);

    // eslint-disable-next-line no-extra-boolean-cast
    if (!!localSettings.HOOK_SHUTDOWN) {
        disconnectRequired = false;
        // eslint-disable-next-line no-empty-function
        sailor.reportError = () => {
        };
        await sailor.prepare();
        await sailor.runHookShutdown();
        return;
    }

    disconnectRequired = true;
    await sailor.connect();
    await sailor.prepare();

    // eslint-disable-next-line no-extra-boolean-cast
    if (!!settings.STARTUP_REQUIRED) {
        await sailor.startup();
    }

    await sailor.runHookInit();
    await sailor.run();
}

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

async function run(localSettings) {
    try {
        await putOutToSea(localSettings);
    } catch (e) {
        if (sailor) {
            await sailor.reportError(e);
        }
        logger.criticalErrorAndExit('putOutToSea.catch', e);
    }
}

exports._disconnectOnly = _disconnectOnly;
exports.run = run;

if (require.main === module || process.mainModule.filename === __filename) {
    process.on('SIGTERM', () => {
        logger.info('Received SIGTERM');
        gracefulShutdown();
    });

    process.on('SIGINT', () => {
        logger.info('Received SIGINT');
        gracefulShutdown();
    });

    process.on('uncaughtException', logger.criticalErrorAndExit.bind(logger, 'process.uncaughtException'));

    run(settings.readFrom(process.env));
}
