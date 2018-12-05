const { optional } = require('./check-env');
const pjson = require('../../package.json');

module.exports = {
    port: optional('PORT', 9001),
    wellKnown: {
        version: pjson.version,
    },
    apiBase: optional('API_BASE', '/api/v1'),
    logging: {
        namespace: optional('LOGGING_NAMESPACE', pjson.name),
        level: optional('LOGGING_LEVEL', 'error'),
    },
    mongoDbConnection: optional('MONGODB_CONNECTION', `mongodb://localhost:27017/${pjson.name}`),
    debugMode: optional('DEBUG_MODE', false) === true,
    ttl: {
        authFlow: '2m',
    },
};
