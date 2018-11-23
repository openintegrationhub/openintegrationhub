class BaseHandler {
    constructor(req, res) {
        this._req = req;
        this._res = res;
        this._isStopped = false;
        this._dateStarted = Date.now();
        this._logger = req.logger.child({
            requestId: this.getRequestId()
        });

        req.on('close', () => this._isStopped = true);
        res.on('end', () => this._isStopped = true);
    }

    handle() {
        throw new Error('This method has to be implemented');
    }

    isStopped() {
        return this._isStopped;
    }

    getDuration() {
        return Date.now() - this._dateStarted;
    }

    getLogger() {
        return this._logger;
    }

    getRequestId() {
        return this._req.id;
    }

    getFlow() {
        return this._req.task; //@todo: rename to flow
    }
}

module.exports = BaseHandler;
