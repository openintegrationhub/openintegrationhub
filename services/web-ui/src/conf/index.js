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
};

export function getConfig() {
    return config;
}

export function updateConfig(update) {
    config = Object.assign(config, update);
}
