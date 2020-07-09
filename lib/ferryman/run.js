const logger = require('./lib/logging.js');
const Sailor = require('./lib/sailor.js').Sailor;
const settings = require('./lib/settings.js');

let sailor;
let disconnectRequired;

async function putOutToSea(settings) {
    sailor = new Sailor(settings);

    //eslint-disable-next-line no-extra-boolean-cast
    if (!!settings.HOOK_SHUTDOWN) {
        disconnectRequired = false;
        //eslint-disable-next-line no-empty-function
        sailor.reportError = () => {
        };
        await sailor.prepare();
        await sailor.runHookShutdown();
        return;
    }

    disconnectRequired = true;
    await sailor.connect();
    await sailor.prepare();

    //eslint-disable-next-line no-extra-boolean-cast
    if (!!settings.STARTUP_REQUIRED) {
        await sailor.startup();
    }

    await sailor.runHookInit();
    await sailor.run();
}

async function disconnectAndExit() {
    if (!disconnectRequired) {
        return;
    }
    disconnectRequired = false;
    try {
        logger.info('Disconnecting...');
        await sailor.disconnect();
        logger.info('Successfully disconnected');
        process.exit();
    } catch (err) {
        logger.error('Unable to disconnect', err.stack);
        process.exit(-1);
    }
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

async function run(settings) {
    try {
        await putOutToSea(settings);
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
    process.on('SIGTERM', function onSigterm() {
        logger.info('Received SIGTERM');
        gracefulShutdown();
    });

    process.on('SIGINT', function onSigint() {
        logger.info('Received SIGINT');
        gracefulShutdown();
    });

    process.on('uncaughtException', logger.criticalErrorAndExit.bind(logger, 'process.uncaughtException'));

    run(settings.readFrom(process.env));
}
