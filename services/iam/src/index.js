const App = require('./app');
const pjson = require('../package.json');
const conf = require('./conf');
const memwatch = require('memwatch-next');
const mongoose = require('mongoose');

const log = require('@basaas/node-logger').getLogger(`${conf.general.loggingNameSpace}/init`, {
    level: 'info',
});

log.info('Startup');

memwatch.on('leak', (info) => {
    log.warn('POTENTIAL MEMORY LEAK', info);
});

function exitHandler(options, err) {
    if (options.cleanup) { log.info('Clean shutdown'); }
    if (err) { log.error('error', err.message); }
    if (options.exit) { process.exit(); }
}

// do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// main task
const mainApp = new App();

(async () => {
    try {
        await mainApp.setup(mongoose);

        if (conf.general.useHttps) {
            log.info('Using local https');
            await mainApp.startSecure();
        } else {
            await mainApp.start();
        }

        log.info(`${pjson.name} ${pjson.version} started`);
        log.info(`Listening on ${mainApp.app.get('port')}`);
    } catch (err) {
        log.error(err);
        process.exit(1);
    }
})();

