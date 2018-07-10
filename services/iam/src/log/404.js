const conf = require('./../conf');

const log = require('@basaas/node-logger').getLogger(`${conf.general.loggingNameSpace}/error`, {
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
