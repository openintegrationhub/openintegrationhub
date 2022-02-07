const Logger = require('@basaas/node-logger');
const moment = require('moment');
const conf = require('../conf');

const log = Logger.getLogger(`${conf.general.loggingNameSpace}/access`);

const logExpress = (req) => {
    const now = moment();
    const formatted = now.format('YYYY-MM-DD HH:mm:ss');
    log.debug(`### ${formatted} ###`);
    const message = `method ${req.method} path ${req.path}`;  
    log.debug(message);
};

module.exports = function(req, res, next) {

    if (conf.general.debug) {
        logExpress(req);
    }
    next();
}; 
