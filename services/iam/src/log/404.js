const Logger = require('@basaas/node-logger');
const conf = require('../conf');

const log = Logger.getLogger(`${conf.general.loggingNameSpace}/error`, {
    level: 'info',
});

const logExpress = () => {
    log.warn('Ressource not found');
    // log.info('body', req.body);
};

module.exports = function(req, res, next) {
    if (conf.general.debug) {
        logExpress();
    }
    next();
}; 
