const Logger = require('@basaas/node-logger');
const { EventBus } = require('@openintegrationhub/event-bus');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const App = require('./app');
const pjson = require('../package.json');
const conf = require('./conf');
process.title = `node ${require('../package.json').name} ${require('../package.json').version}`;

const log = Logger.getLogger(`${conf.general.loggingNameSpace}/init`, {
    level: 'info',
});

function exitHandler(options, err) {
    if (options.cleanup) {
        log.info('Clean shutdown');
    }
    if (err) {
        log.error('error', err.message);
    }
    if (options.exit) {
        process.exit();
    }
}

// do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

(async () => {
    try {
        // configuring the EventBus
        const eventBus = new EventBus({ serviceName: conf.general.loggingNameSpace, rabbitmqUri: conf.general.rabbitmqUrl });

        await eventBus.connect();
        // main task
        const mainApp = new App({ eventBus });

        await mainApp.setup();

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
