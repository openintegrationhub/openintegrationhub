let config = {
    tableConfig: {
        user: {
            username: 'Username',
            role: 'Role',
            createdAt: 'Created At',
            status: 'Status',
        },
        tenant: {
            tenantname: 'Organisations',
            createdAt: 'Created At',
            status: 'Status',
        },
    },
};

export function getConfig() {
    return config;
}

export function updateConfig(update) {
    config = Object.assign(config, update);
}
