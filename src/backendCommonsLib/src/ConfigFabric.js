const path = require('path');
const nconf = require('nconf');

class ConfigFabric {
    static createConfig() {
        const environment = process.env.NODE_ENV;
        const projectRoot = this._findProjectRoot();
        nconf.env();
        nconf.file(path.resolve(projectRoot, 'config', `${environment}.json`));
        nconf.file('default', path.resolve(projectRoot, 'config', `default.json`));
        nconf.defaults(this._getDefaults());
        return nconf;
    }

    static _findProjectRoot() {
        let m = module;
        while (m.parent) {
            m = m.parent;
        }
        return path.dirname(m.filename);
    }
    static _getDefaults() {
        return {
            RABBITMQ_URI: 'amqp://guest:guest@127.0.0.1:5672/',
            LOG_LEVEL: 'info',
            NAMESPACE: 'flows',
            LISTEN_PORT: 1234
        }
    }
}
module.exports = ConfigFabric;
