const { optional } = require('./check-env');
const { version, name } = require('../../package.json');

module.exports = {
    port: optional('PORT', 9001),
    wellKnown: {
        version,
    },
    apiBase: optional('API_BASE', '/api/v1'),
    userAuthType: optional('AUTH_TYPE', 'oidc'),
    iam: {
        introspectType: optional('INTROSPECT_TYPE', 'BASIC'),
        introspectEndpoint: optional('INTROSPECT_ENDPOINT', 'https://accounts.basaas.com/op/userinfo'),
        tokenEndpoint: optional('IAM_TOKEN_API', 'https://accounts.basaas.com/api/v1/tokens/ephemeral'),
        token: optional('IAM_TOKEN', 'token'),
        oidcServiceClientId: optional('IAM_OIDC_SERVICE_CLIENT_ID', 'id'),
        oidcServiceClientSecret: optional('IAM_OIDC_SERVICE_CLIENT_SECRET', 'secret'),
    },
    logging: {
        namespace: optional('LOGGING_NAMESPACE', name),
        level: optional('LOGGING_LEVEL', 'error'),
    },
    mongoDbConnection: optional('MONGODB_CONNECTION', `mongodb://localhost:27017/${name}`),
    debugMode: optional('DEBUG_MODE', 'false') === 'true',
    ttl: {
        authFlow: optional('TTL_AUTHFLOW', '2m'),
    },
    // token refreshing
    refreshTimeout: parseInt(optional('REFRESH_TIMEOUT', 1000 * 10), 10), /* assume refresh token timeout after 10 seconds */
    expirationOffset: parseInt(optional('EXPIRATION_OFFSET', 1000 * 60 * 5), 10), /* refresh 5 minutes before expiration of access_token */
    pagination: {
        defaultPage: parseInt(optional('PAGINATION_DEFAULT_PAGE', 1), 10), // default page is 1
        pageSize: parseInt(optional('PAGINATION_PAGE_SIZE', 5), 10), // show 5 items per page
    },
};
