module.exports = {

    adminToken: {
        token: 'adminToken',
        value: {
            sub: 'TestAdmin',
            username: 'admin@example.com',
            role: 'ADMIN',
            permissions: ['all'],
            iat: 1337,
        },
    },

    userToken: {
        token: 'userToken',
        value: {
            sub: 'TestUser',
            username: 'user@example.com',
            tenant: 'TestTenant',
            permissions: ['logs.read', 'logs.push'],
            iat: 1337,
        },
    },

    guestToken: {
        token: 'guestToken',
        value: {
            sub: 'TestGuest',
            username: 'guest@example.com',
            permissions: ['logs.read', 'logs.push'],
            tenant: '3',
            iat: 1337,
        },
    },

};
