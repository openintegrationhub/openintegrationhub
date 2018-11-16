const commons = require('@elastic.io/commons');

class Config extends commons.Config {
    static get REQUIRED_VARIABLES() {
        return [
            'MONGO_URI',
            'AMQP_URI',
            'STEWARD_URI',
            //@see https://github.com/elasticio/commons/issues/811
            'ENVIRONMENT',
            'PORT_GATEWAY',
            'APP_NAME',
            'PAYLOAD_SIZE_LIMIT',
            'REQUEST_REPLY_TIMEOUT'
        ]
    }
    static get DEFAULTS() {
        return {
            APP_NAME: 'webhooks',
            PORT_GATEWAY: 5000,
            PAYLOAD_SIZE_LIMIT: '10mb',
            REQUEST_REPLY_TIMEOUT: 1000 * 60 * 3,
            LOG_LEVEL: 'trace'
        };
    }
}
module.exports = Config;
