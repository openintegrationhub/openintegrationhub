module.exports = {
    STATUS: {
        READY: 'READY',
        DISABLED: 'DISABLED',
        STARTED: 'STARTED',
        RUNNING: 'RUNNING',
        FINISHED: 'FINISHED',
        ABORTED: 'ABORTED',
        WORKING: 'WORKING',
        FAILED: 'FAILED',
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
        TENANT_MISMATCH: 'TENANT_MISMATCH',
        DEFAULT: 'UNKNOWN_ERROR',
    },
    WORKFLOW_TYPES: {
        TEMPLATE: 'TEMPLATE',
        DEFAULT: 'DEFAULT',
    },
    DEPENDENCY_TYPES: {
        ONE_OF: 'ONE_OF',
        ALL: 'ALL',
    },
    SCOPES: {
        PRIVATE: 'PRIVATE',
        TENANT: 'TENANT',
        GLOBAL: 'GLOBAL',
    },
};
