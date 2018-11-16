const Config = require('../lib/Config.js');
module.exports.buildFakeConfig = function buildFakeConfig () {
    const config = new Config();
    config.setConfig({
        AMQP_URI: 'amqp://guest:guest@localhost:5672/',
        APP_NAME: 'scheduler',
        ENVIRONMENT: 'integration_test',
        ACCOUNTS_PASSWORD: 'sIr3E8zWozIWrUGZSKYHOnBIZQCmHt',
        MONGO_URI: 'mongodb://localhost/eio-test',
        PORT_GATEWAY: 8000,
        STEWARD_URI: 'http://steward:8000',
        PAYLOAD_SIZE_LIMIT: '10mb',
        REQUEST_REPLY_TIMEOUT: '10000',
        RABBITMQ_STATS_URI: 'http://localhost:15672',
        RABBITMQ_STATS_LOGIN: 'guest',
        RABBITMQ_STATS_PASS: 'guest',
        RABBITMQ_VIRTUAL_HOST: '/'
    });
    return config;
};
