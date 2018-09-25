
const CONFIG = {

    issuer: process.env.IAM_JWT_ISSUER || 'https://www.example.com',
    audience: process.env.IAM_JWT_AUDIENCE || 'service.example.com',
    hmacSecret: process.env.IAM_JWT_HMAC_SECRET || 'example',
    updateUserData: process.env.IAM_UPDATE_USERDATA || true,
    iamBaseUrl: process.env.IAM_BASE_URL || 'http://localhost:3099',

    getJwksUri: () => `${CONFIG.iamBaseUrl}/.well-known/jwks.json`,
    getUserData: (userid) => `${CONFIG.iamBaseUrl}/api/v1/users/${userid}`,
    getTenantData: (tenantid) => `${CONFIG.iamBaseUrl}/api/v1/tenants/${tenantid}`,
    getUserAndTenantData: () => `${CONFIG.iamBaseUrl}/token`,

};

module.exports = CONFIG;