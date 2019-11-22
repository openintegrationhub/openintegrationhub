const { optional } = require('./check-env');
const { name } = require('../../package.json');

module.exports = {
    serviceName: name,
    port: optional('PORT', 3000),
    log: {
        namespace: optional('LOG_NAMESPACE', name),
        level: optional('LOG_LEVEL', 'error'),
    },
    grafana: {
        url: optional('GRAFANA_URL', 'http://127.0.0.1:8888'),
        token: optional('GRAFANA_TOKEN', ''),
    },
    mongoDbConnection: optional('MONGODB_CONNECTION', 'mongodb://localhost:27017/reports-analytics?replicaSet=rs'),
    influxDatabase: optional('INFLUXDB_DATABASE', 'statistics'),
    debugMode: optional('DEBUG_MODE', 'false') === 'true',
};
