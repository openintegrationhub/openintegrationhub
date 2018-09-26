const bunyan = require('bunyan');
const ConfigFabric = require('./ConfigFabric.js');

class App {
    constructor() {
        this._config = this._createConfig();
        this._logger = this._createLogger();
    }
    async start() {
        this.getLogger().info('Starting');
        try {
            await this._run();
            this.getLogger().info('Start');
        } catch (e) {
            this.getLogger().error(e, 'Can not start app');
            throw e;
        }
    }

    async stop() {
    }

    getLogger() {
        return this._logger;
    }

    getConfig() {
        return this._config;
    }

    _createConfig() {
        return ConfigFabric.createConfig();
    }

    _createLogger() {
        return bunyan({
            name: this.constructor.NAME,
            level: this.getConfig().get('LOG_LEVEL')
        });
    }

    async _run () {
        throw new Error('implement me'); 
    }

    static get NAME () {
        throw new Error('implement me'); 
    }
}
module.exports = App;
