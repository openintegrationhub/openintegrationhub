const { optional, required } = require('./check-env');
const pjson = require('../../package.json');

module.exports = {
    port: optional('PORT', 9001),
    wellKnown: {
        version: pjson.version,
    },
    apiBase: optional('API_BASE', '/api/v1'),
    userAuthType: optional('AUTH_TYPE', 'oidc'),
    introspectEndpoint: optional('INTROSPECT_ENDPOINT', 'https://accounts.basaas.com/op/userinfo'),
    introspectHeader: process.env.INTROSPECT_BASIC ? { 'x-auth-type': 'basic' } : {},
    iamTokenEndpoint: optional('IAM_TOKEN_API', 'https://accounts.basaas.com/api/v1/tokens/ephemeral'),
    iamToken: required('IAM_TOKEN'),
    logging: {
        namespace: optional('LOGGING_NAMESPACE', pjson.name),
        level: optional('LOGGING_LEVEL', 'error'),
    },
    mongoDbConnection: optional('MONGODB_CONNECTION', `mongodb://localhost:27017/${pjson.name}`),
    debugMode: optional('DEBUG_MODE', 'false') === 'true',
    ttl: {
        authFlow: optional('TTL_AUTHFLOW', '2m'),
    },
    // token refreshing
    refreshTimeout: parseInt(optional('REFRESH_TIMEOUT', 1000 * 10), 10), /* assume refresh token timeout after 10 seconds */
    expirationOffset: parseInt(optional('EXPIRATION_OFFSET', 1000 * 60 * 5), 10), /* refresh 5 minutes before expiration of access_token */
};
