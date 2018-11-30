const BaseHandler = require('./base');

class HeadHandler extends BaseHandler {
    async handle() {
        this._res.status(200).end();
    }
}

module.exports = HeadHandler;
