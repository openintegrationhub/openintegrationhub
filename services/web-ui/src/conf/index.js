let config = {
    tableConfig: {
        user: [
            'username',
            'role',
            'createdAt',
            'updatedAt',
            'status',
        ],
        tenant: [
            'name',
            'status',
            'createdAt',
            'updatedAt',
        ],
    },
    account: {
        roles: {
            ADMIN: 'ADMIN',
            TENANT_ADMIN: 'TENANT_ADMIN',
            USER: 'USER',
            SERVICE_ACCOUNT: 'SERVICE_ACCOUNT',
        },
        status: {
            ACTIVE: 'ACTIVE',
            PENDING: 'PENDING',
            DISABLED: 'DISABLED',
            AWAITING_CONFIRM: 'AWAITING_CONFIRM',
            AWAITING_ACTIVATION: 'AWAITING_ACTIVATION',
            AWAITING_ADMIN_ACTION: 'AWAITING_ADMIN_ACTION',
            AWAITING_APPROVAL: 'AWAITING_APPROVAL',
        },
    },
    tenant: {
        roles: {
            ADMIN: 'ADMIN',
            USER: 'USER',
        },
        status: {
            ACTIVE: 'ACTIVE',
            PENDING: 'PENDING',
            DISABLED: 'DISABLED',
        },
    },
    secret: {
        type: {
            API_KEY: 'API_KEY',
            OA1_TWO_LEGGED: 'OA1_TWO_LEGGED',
            OA1_THREE_LEGGED: 'OA1_THREE_LEGGED',
            OA2_AUTHORIZATION_CODE: 'OA2_AUTHORIZATION_CODE',
            SIMPLE: 'SIMPLE',
            MIXED: 'MIXED',
        },
    },
};

export function getConfig() {
    return config;
}

export function updateConfig(update) {
    config = Object.assign(config, update);
}
