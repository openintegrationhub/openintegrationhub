const bunyan = require('bunyan');
const awilix = require('awilix');
const { asValue, asClass } = awilix;
const ConfigFabric = require('./ConfigFabric');
const AMQPService = require('./AMQPService');
const K8sService = require('./K8sService');

class App {
    constructor() {
        this._config = this._createConfig();
        this._logger = this._createLogger();
        this._initContainer();
    }

    _initContainer() {
        this._container = awilix.createContainer();
        this._container.register({
            config: asValue(this._config),
            logger: asValue(this._logger),
            amqp: asClass(AMQPService).singleton(),
            k8s: asClass(K8sService).singleton(),
        });
    }

    get awilix() {
        return awilix;
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

    getContainer() {
        return this._container;
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
            level: this.getConfig().get('LOG_LEVEL'),
            serializers: bunyan.stdSerializers
        });
    }

    async _run() {
        throw new Error('implement me');
    }

    static get NAME() {
        throw new Error('implement me');
    }
}
module.exports = App;
