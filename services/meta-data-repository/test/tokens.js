module.exports = {

    user1: {
        token: 'user1',
        value: {
            sub: 'u1',
            name: 'User1',
            role: 'USER',
            iat: 1337,
            memberships: [
                {
                    tenant: '5c507eb60838f1f976e5f2a4',
                    permissions: [
                    ],
                    active: true,
                },
            ],
            permissions: [],
        },
    },
    user2: {
        token: 'user2',
        value: {
            sub: 'u2',
            name: 'User2',
            role: 'USER',
            iat: 1337,
            memberships: [
                {
                    tenant: '5c507eb60838f1f976e5f2a4',
                    permissions: [
                    ],
                    active: true,
                },
            ],
            permissions: [],
        },
    },
    admin: {
        token: 'admin',
        value: {
            sub: 'admin',
            name: 'admin',
            role: 'ADMIN',
            iat: 1337,
            memberships: [
                {
                    tenant: '5c507eb60838f1f976e5f2a4',
                    permissions: [
                    ],
                    active: true,
                },
            ],
            permissions: [],
        },
    },
};
