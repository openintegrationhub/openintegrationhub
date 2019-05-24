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
            'organisations',
            'createdAt',
            'updatedAt',
            'status',
        ],
    },
};

export function getConfig() {
    return config;
}

export function updateConfig(update) {
    config = Object.assign(config, update);
}
