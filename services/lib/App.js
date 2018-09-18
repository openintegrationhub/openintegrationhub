const bunyan = require('bunyan');
const Config = require('./Config.js');

class App {
    constructor() {
        this._config = new Config();
        this._logger = bunyan({
            name: this.constructor.NAME,
            level: this._config.get('LOG_LEVEL')
        });
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
    async _run () {
        throw new Error('implement me'); 
    }
    getLogger() {
        return this._logger;
    }
    getConfig() {
        return this._config;
    }
    getService(name) {
        return this._dependencies[name]; 
    }
    static get NAME () {
        throw new Error('implement me'); 
    }
}
module.exports = App;
