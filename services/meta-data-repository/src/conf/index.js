const path = require('path');
const { optional, required } = require('./check-env');
const { version, name } = require('../../package.json');

const originwhitelist = optional('ORIGINWHITELIST') ? optional('ORIGINWHITELIST').split(',') : [];

module.exports = {
    port: optional('PORT', 3000),
    urlsWithPort: optional('URLS_WITH_PORT', 'true') === 'true',
    baseUrl: optional('BASE_URL', 'http://localhost'),
    apiBase: optional('API_BASE', '/api/v1'),
    userAuthType: optional('AUTH_TYPE', 'basic'),
    importFilePath: path.resolve(optional('IMPORT_FILE_PATH', 'temp')),
    iam: {
        apiBase: optional('IAM_API_BASE', 'http://iam.openintegrationhub.com/api/v1'),
        introspectType: optional('INTROSPECT_TYPE', 'basic'),
        introspectEndpoint: optional('INTROSPECT_ENDPOINT_OIDC', 'https://iam.openintegrationhub.com/op/userinfo'),
        introspectEndpointBasic: optional('INTROSPECT_ENDPOINT_BASIC', 'http://iam.openintegrationhub.com/api/v1/tokens/introspect'),
        tokenEndpoint: optional('IAM_TOKEN_API', 'http://iam.openintegrationhub.com/api/v1/tokens/ephemeral'),
        token: required('IAM_TOKEN', 'token'),
        oidcServiceClientId: optional('IAM_OIDC_SERVICE_CLIENT_ID', 'id'),
        oidcServiceClientSecret: optional('IAM_OIDC_SERVICE_CLIENT_SECRET', 'secret'),
    },
    originWhitelist: originwhitelist.concat(optional('NODE_ENV') !== 'production' ? [
        // development only
        '127.0.0.1',
        'localhost',
    ] : [

    ]),
    log: {
        namespace: optional('LOG_NAMESPACE', name),
        level: optional('LOG_LEVEL', 'error'),
    },
    mongoDbConnection: optional('MONGODB_CONNECTION', `mongodb://localhost:27017/${name}?replicaSet=rs`),
    debugMode: optional('DEBUG_MODE', 'false') === 'true',
    // token refreshing
    pagination: {
        defaultPage: parseInt(optional('PAGINATION_DEFAULT_PAGE', 1), 10), // default page is 1
        pageSize: parseInt(optional('PAGINATION_PAGE_SIZE', 30), 10), // show 10 items per page
    },
    wellKnown: {
        version,
    },
};
