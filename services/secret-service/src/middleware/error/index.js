const logger = require('@basaas/node-logger');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.logging.namespace}/error`);

const defaultErrorHandler = (err, req, res, next) => { // eslint-disable-line
    log.error(err);
    const status = err.status || 500;
    const message = err.message || '';

    res.status(status);
    res.send({
        message,
    });
};

module.exports = {
    default: defaultErrorHandler,
};
