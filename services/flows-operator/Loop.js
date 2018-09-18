const logger = require('./logger.js');
class Loop {
    constructor() {
        this._isRunning = false;
        this._tickTimer = null;
        this._logger = logger;
    }
    start() {
        this._isRunning = true;
        this._iterate();
    }
    stop() {
        this._isRunning = false;
        clearTimeout(this._tickTimer);
    }

    async _iterate() {
        if (!this._isRunning) {
            return;
        }
        this._logger.trace('Loop iteration');
        const startTimestamp = Date.now();
        let warnTimeout;
        try {
            warnTimeout = setTimeout(() => {
                this._logger.error({
                    timeout: this.constructor.WARN_TIMEOUT
                }, 'loop iteration works too long');
            }, this.constructor.WARN_TIMEOUT);
            await this._loopBody();
        } catch (e) {
            this._logger.error(e, 'Loop iteration failed');
        } finally {
            clearTimeout(warnTimeout);
            this._logger.info(`Loop iteration takes ${Date.now() - startTimestamp}ms`);
        }
        this._tickTimer = setTimeout(this._iterate.bind(this), this.constructor.LOOP_INTERVAL);
    }

    async _loopBody() {
        throw new Error('should be implemented');
    }

    static get LOOP_INTERVAL() {
        return 10000;
    }
    static get WARN_TIMEOUT() {
        return 100000;
    }
}
module.exports = Loop;
