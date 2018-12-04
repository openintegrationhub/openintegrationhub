const bunyan = require('bunyan');

/**
 * Base class for webhook request handlers.
 */
class BaseHandler {
    /**
     * @param req - express request object
     * @param res - express response object
     */
    constructor(req, res) {
        this._req = req;
        this._res = res;
        this._isStopped = false;
        this._dateStarted = Date.now();
        const logger = req.logger || bunyan.createLogger({name: 'request-handler'});
        this._logger = logger.child({
            requestId: this.getRequestId()
        });

        req.on('close', () => this._isStopped = true);
        res.on('end', () => this._isStopped = true);
    }

    /**
     * Handle incoming webhook request.
     */
    handle() {
        throw new Error('This method has to be implemented');
    }

    /**
     * Returns true if a request is stopped (by user or already responded).
     * @returns {boolean}
     */
    isStopped() {
        return this._isStopped;
    }

    /**
     * Return a request duration. Is counted from the instance creation time.
     * @returns {number}
     */
    getDuration() {
        return Date.now() - this._dateStarted;
    }

    /**
     * Get logger.
     * @returns {Logger}
     */
    getLogger() {
        return this._logger;
    }

    /**
     * Return request ID.
     * @returns {string}
     */
    getRequestId() {
        return this._req.id;
    }

    /**
     * Return a flow which is supposed to receive the webhook.
     * @returns {Flow}
     */
    getFlow() {
        return this._req.flow;
    }
}

module.exports = BaseHandler;
