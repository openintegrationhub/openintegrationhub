const Logger = require('@basaas/node-logger');
const conf = require('../conf');

const log = Logger.getLogger(`${conf.general.loggingNameSpace}/httpAccess`, {
    level: 'info',
});

const logExpressError = (err) => {
    if (err) {
        log.error(err);
    } else if (err.message) {
        log.error(err.status || 500);
        log.error(err.message);
    } else if (err.status) {
        log.error(err.status);
    } else {
        log.error(500);
        log.error(err);
    }

    // log.info('body', req.body);
};

module.exports = (err, req, res, next) => {
    if (conf.general.debug) {
        logExpressError(err);
    }
    next(err);
}; 

