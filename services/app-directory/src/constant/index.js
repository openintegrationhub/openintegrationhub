module.exports = {
    STATUS: {
        ACTIVE: 'ACTIVE',
        DISABLED: 'DISABLED',
    },
    ROLES: {
        ADMIN: 'ADMIN',
        SERVICE_ACCOUNT: 'SERVICE_ACCOUNT',
        USER: 'USER',
    },
    AUTH_TYPES: {
        oidc: 'oidc',
        basic: 'basic',
    },
    ENTITY: {
        USER: 'USER',
        TENANT: 'TENANT',
        APP: 'APP',
        CUSTOM_APP: 'CUSTOM_APP',
    },
    ERROR_CODES: {
        INPUT_INVALID: 'INPUT_INVALID',
        MISSING_PERMISSION: 'MISSING_PERMISSION',
        ENTITY_NOT_FOUND: 'ENTITY_NOT_FOUND',
        DUPLICATE_KEY: 'DUPLICATE_KEY',
        ENTITY_ALREADY_EXISTS: 'ENTITY_ALREADY_EXISTS',
        ENTITY_DISABLED: 'ENTITY_DISABLED',
        FORBIDDEN: 'FORBIDDEN',
        SESSION_EXPIRED: 'SESSION_EXPIRED',
        INVALID_HEADER: 'INVALID_HEADER',
        INVALID_TOKEN: 'INVALID_TOKEN',
        DEFAULT: 'UNKNOWN_ERROR',
    },
    PERMISSIONS: {
        MANAGE_APPS: 'MANAGE_APPS',
    },
};
