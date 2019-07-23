module.exports = {
    EXTERNAL_SOURCE: {
        ID_TOKEN: 'id_token',
        ACCESS_TOKEN: 'access_token',
        USERINFO: 'userinfo',
        TOKEN_RESPONSE: 'token_response',
    },
    AUTH_TYPE: {
        API_KEY: 'API_KEY',
        OA1_TWO_LEGGED: 'OA1_TWO_LEGGED',
        OA2_AUTHORIZATION_CODE: 'OA2_AUTHORIZATION_CODE',
        SIMPLE: 'SIMPLE',

    },
    ENTITY_TYPE: {
        USER: 'USER',
        SERVICE_ACCOUNT: 'SERVICE_ACCOUNT',
        TENANT: 'TENANT',
        GROUP: 'GROUP',
        WORKSPACE: 'WORKSPACE',
    },
    ROLE: {
        TENANT_ADMIN: 'TENANT_ADMIN',
        ADMIN: 'ADMIN',
        USER: 'USER',
        SERVICE_ACCOUNT: 'SERVICE_ACCOUNT',
    },
    ERROR_CODE: {
        MISSING_PERMISSION: 'MISSING_PERMISSION',
    },
    PERMISSIONS: {
        restricted: {},
    },
};
