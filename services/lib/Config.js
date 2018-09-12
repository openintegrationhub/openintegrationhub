class Config {
    constructor() {
        this._config = this._defaults();
        this._config = Object.assign({}, this._config, process.env);
    }
    get(key) {
        return this._config[key];
    }
    set(key, value) {
        return this._config[key] = value;
    }
    _defaults() {
        return {
            RABBITMQ_URI: 'amqp://guest:guest@127.0.0.1:5672/',
            LOG_LEVEL: 'info',
            NAMESPACE: 'flows',
            LISTEN_PORT: 1234
        }
    }
}
module.exports = Config;
