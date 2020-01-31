const logger = require('./lib/logging');
const service = require('./lib/service');
const debug = require('debug')('sailor');

const serviceMethod = process.argv[2];

debug('About to execute %s', serviceMethod);

service.processService(serviceMethod, process.env)
    .catch(logger.criticalErrorAndExit.bind(logger, 'processService.catch'))
    .done(() => {
        process.exit(0);
    });

process.on('uncaughtException', logger.criticalErrorAndExit.bind(logger, 'runService.uncaughtException'));
