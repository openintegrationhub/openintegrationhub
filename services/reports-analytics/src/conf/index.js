const { optional } = require('./check-env');
const { name } = require('../../package.json');

module.exports = {
    port: optional('PORT', 3000),
    log: {
        namespace: optional('LOG_NAMESPACE', name),
        level: optional('LOG_LEVEL', 'error'),
    },
    mongoDbConnection: optional('MONGODB_CONNECTION', `mongodb://localhost:27017/${name}?replicaSet=rs`),
    debugMode: optional('DEBUG_MODE', 'false') === 'true',
};
