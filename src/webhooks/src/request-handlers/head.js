const BaseHandler = require('./base');

class HeadHandler extends BaseHandler {
    async handle() {
        const logger = this.getLogger();
        logger.info('webhook_verify_request'); //@todo: remove logs, which e.io relies on
        logger.info({ status: 200 }, 'webhook_verify_status');
        this._res.writeHead(200);
        this._res.end();
    }
}

module.exports = HeadHandler;
