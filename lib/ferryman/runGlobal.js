const co = require('co');
const logger = require('./lib/logging.js');
const { Ferryman } = require('./lib/ferryman.js');
const settings = require('./lib/settings.js');

let ferryman;
let disconnectRequired;

async function putOutToSea(settings) {
    ferryman = new Ferryman(settings);

    // eslint-disable-next-line no-extra-boolean-cast
    if (!!settings.HOOK_SHUTDOWN) {
        disconnectRequired = false;
        // eslint-disable-next-line no-empty-function
        ferryman.reportError = () => {
        };
        // await ferryman.prepare();

        await ferryman.runHookShutdown();
        return;
    }

    disconnectRequired = true;

    await ferryman.connect();
    await ferryman.prepare();

    if (settings.ENABLE_REST_API === 'true') {
        await ferryman.setupRestAPI();
    }

    // eslint-disable-next-line no-extra-boolean-cast
    // if (!!settings.STARTUP_REQUIRED) {
    //   await ferryman.startup();
    // }

    // await ferryman.runHookInit();

    await ferryman.run();
}

function disconnectAndExit() {
    if (!disconnectRequired) {
        return;
    }
    disconnectRequired = false;
    co(function* putIn() {
        logger.info('Disconnecting...');
        yield ferryman.disconnect();
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
    return ferryman.disconnect();
}

function gracefulShutdown() {
    if (!disconnectRequired) {
        return;
    }

    if (!ferryman) {
        logger.warn('Something went wrong – ferryman is falsy');
        return;
    }

    ferryman.scheduleShutdown().then(disconnectAndExit);
}

async function run(settings) {
    try {
        await putOutToSea(settings);
    } catch (e) {
        console.error(e);
        if (ferryman) {
            await ferryman.reportError(e);
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
