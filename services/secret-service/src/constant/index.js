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
        OA1_THREE_LEGGED: 'OA1_THREE_LEGGED',
        OA2_AUTHORIZATION_CODE: 'OA2_AUTHORIZATION_CODE',
        SIMPLE: 'SIMPLE',
        MIXED: 'MIXED',
        SESSION_AUTH: 'SESSION_AUTH',

    },
    AUTH_REQUEST_TYPE: {
        HEADER_AUTH: 'HEADER_AUTH',
        BODY_AUTH: 'BODY_AUTH',
        PARAMS_AUTH: 'PARAMS_AUTH',
        FORM_AUTH: 'FORM_AUTH',
    },
    ENTITY_TYPE: {
        USER: 'USER',
        SERVICE_ACCOUNT: 'SERVICE_ACCOUNT',
        TENANT: 'TENANT',
        GROUP: 'GROUP',
        WORKSPACE: 'WORKSPACE',
    },
    ROLE: {
        ADMIN: 'ADMIN',
        USER: 'USER',
        SERVICE_ACCOUNT: 'SERVICE_ACCOUNT',
    },
    CRYPTO: {
        METHODS: {
            ENCRYPT: 'encrypt',
            DECRYPT: 'decrypt',
        },
        SENSITIVE_FIELDS: [
            'accessTokenSecret',
            'accessToken',
            'refreshToken',
            'passphrase',
            'username',
            'payload',
            'inputFields',
        ],
        // subset of SENSITIVE_FIELDS
        OBJECT_FIELDS: [
            'inputFields',
        ],
    },
    ERROR_CODE: {
        MISSING_PERMISSION: 'MISSING_PERMISSION',
    },
};
