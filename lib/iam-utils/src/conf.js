
const CONFIG = {

    apiBase: process.env.IAM_API_BASE || 'https://accounts.basaas.com/api/v1',
    iamToken: process.env.IAM_TOKEN || 'NoToken',
    introspectType: process.env.INTROSPECT_TYPE || 'basic',
    introspectEndpointOidc: process.env.INTROSPECT_ENDPOINT_OIDC || 'https://accounts.basaas.com/op/userinfo',
    introspectEndpointBasic: process.env.INTROSPECT_ENDPOINT_BASIC || 'https://accounts.basaas.com/api/v1/tokens/introspect',
    oidcServiceClientId: process.env.OIDC_CLIENT_ID || 'id',
    oidcServiceClientSecret: process.env.OIDC_CLIENT_SECRET || 'secret',

};

module.exports = CONFIG;
