const { optional, required } = require('./check-env');
const pjson = require('../../package.json');

module.exports = {
    port: optional('PORT', 3000),
    wellKnown: {
        version: pjson.version,
    },
    iam: {
        token: required('IAM_TOKEN'),
    },
    apiBase: optional('API_BASE', '/api/v1'),

    logging: {
        namespace: optional('LOGGING_NAMESPACE', pjson.name),
        level: optional('LOG_LEVEL', 'error'),
    },
    mongoDbConnection: optional('MONGODB_CONNECTION', `mongodb://localhost:27017/${pjson.name}`),
    mongoDbPoolSize: parseInt(process.env.MONGODB_POOL_SIZE, 10) || 5,
    debugMode: optional('DEBUG_MODE', 'false') === 'true',
    originWhitelist: [].concat(process.env.ORIGIN_WHITELIST ? process.env.ORIGIN_WHITELIST.split(',') : ['localhost', '127.0.0.1']),

    services: {
        flowApi: optional('FLOW_API_ENDPOINT', 'https://flow-repository.openintegrationhub.com'),
    },
};
