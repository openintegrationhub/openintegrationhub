const logger = require('@basaas/node-logger');
const LRU = require('lru-cache');
const conf = require('../../conf');

const log = logger.getLogger(`${conf.logging.namespace}/auth`);

const options = {
    max: 500,
    maxAge: 1000 * 60 * 60,
    length(n) { return n.length; },

};

const cache = new LRU(options);

module.exports = {
    async getKey(req, res, next) {
        try {
            if (!conf.crypto.isDisabled) {
                // if (!req.app.locals.middleware.key.getKey) {
                //     throw (new Error('Adapter "key/getKey" missing'));
                // }
                // if (!req.keyParameter) {
                //     throw (new Error('Key parameter missing'));
                // }

                const _key = cache.get(req.keyParameter);
                if (_key) {
                    req.key = _key;
                } else {
                    req.key = await req.app.locals.middleware.key.getKey(req.keyParameter);
                    cache.set(req.keyParameter, req.key);
                }
            }
            if (next) {
                return next();
            }
            return req.key;
        } catch (err) {
            err.__errName = 'getKey';
            log.error(err);
            if (next) {
                next({ status: 401 });
            }
        }
    },

    async getKeyParameter(req, res, next) {
        try {
            if (!conf.crypto.isDisabled) {
                // if (!req.app.locals.middleware.key.getKeyParameter) {
                //     throw (new Error('Adapter "key/getKeyParameter" missing'));
                // }
                req.keyParameter = await req.app.locals.middleware.key.getKeyParameter(req.user);
            }
            return next();
        } catch (err) {
            err.__errName = 'getKeyParameter';
            log.error(err);
            next({ status: 401 });
        }
    },
};
