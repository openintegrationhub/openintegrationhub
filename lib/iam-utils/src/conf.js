
const CONFIG = {

    apiBase: process.env.IAM_API_BASE || 'http://iam.openintegrationhub.com/api/v1',
    iamToken: process.env.IAM_TOKEN || 'NoToken',
    iamClientAuthType: process.env.IAM_CLIENT_AUTH_TYPE || 'basic',
    tokenCacheTTL: process.env.IAM_TOKEN_CACHE_TTL || null,
    introspectType: process.env.INTROSPECT_TYPE || 'basic',
    introspectEndpointOidc: process.env.INTROSPECT_ENDPOINT_OIDC || 'http://iam.openintegrationhub.com/op/userinfo',
    introspectEndpointBasic: process.env.INTROSPECT_ENDPOINT_BASIC || 'http://iam.openintegrationhub.com/api/v1/tokens/introspect',
    oidcServiceClientId: process.env.OIDC_CLIENT_ID || 'id',
    oidcServiceClientSecret: process.env.OIDC_CLIENT_SECRET || 'secret',

};

module.exports = CONFIG;
