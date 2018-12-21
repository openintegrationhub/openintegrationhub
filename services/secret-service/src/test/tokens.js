module.exports = {

    adminToken1: {
        token: 'adminToken1',
        value: {
            sub: 'a1',
            name: 'Admin1',
            role: 'ADMIN',
            memberships: ['t1', 't2'],
            iat: 1337,
        },
    },

    userToken1: {
        token: 'userToken1',
        value: {
            sub: 'u2',
            name: 'User2',
            role: 'USER',
            memberships: ['t1'],
            iat: 1337,
        },
    },

    connectorToken: {
        token: 'connectorToken',
        value: {
            sub: 'u2',
            name: 'User2',
            role: 'EPHEMERAL_SERVICE_ACCOUNT',
            memberships: ['t1'],
            permissions: [
                'secrets.raw.read'
            ],
            iat: 1337,
        },
    },

    adminToken2: {
        token: 'adminToken2',
        value: {
            sub: 'a3',
            name: 'Admin3',
            role: 'ADMIN',
            memberships: ['t2'],
            iat: 1337,
        },
    },

    userToken2: {
        token: 'userToken2',
        value: {
            sub: 'u4',
            name: 'User4',
            role: 'NOT_USER',
            memberships: ['t2'],
            iat: 1337,
        },
    },

    userFork: {
        token: 'userFork',
        value: {
            sub: 'userFork',
            name: 'User Fork',
            role: 'USER',
            memberships: ['fork'],
            iat: 1337,
        },
    },

};

