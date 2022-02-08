const log = require('../logging.js');

/* eslint no-unused-vars: 0 */

module.exports = (err, req, res, next) => {
    let status;
    let message;

    if (err.response) {
        status = err.response.statusCode || 500;
        message = err.response.body || '';
    } else {
        status = err.status || 500;
        message = err.message || '';
    }

    log.debug(status, message);

    res.status(status);
    res.send({
        message,
        details: err.details || {}
    });
};
