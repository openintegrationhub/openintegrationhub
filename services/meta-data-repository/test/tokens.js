module.exports = {

    user1: {
        token: 'user1',
        value: {
            sub: 'u1',
            name: 'User1',
            iat: 1337,
            tenant: '5c507eb60838f1f976e5f2a4',
            permissions: ['metadata.domains.crud'],
        },
    },
    user2: {
        token: 'user2',
        value: {
            sub: 'u2',
            name: 'User2',
            iat: 1337,
            tenant: '5c507eb60838f1f976e5f2a4',
            permissions: ['tenant.all'],
        },
    },
    user3: {
        token: 'user3',
        value: {
            sub: 'u3',
            name: 'User3',
            iat: 1337,
            tenant: '5c507eb60838f1f976e5f2a4',
            permissions: [],
        },
    },
    admin: {
        token: 'admin',
        value: {
            sub: 'admin',
            name: 'admin',
            iat: 1337,
            tenant: '5c507eb60838f1f976e5f2a7',
            permissions: ['all'],
        },
    },
    tenantAdmin1: {
        token: 'tenantAdmin1',
        value: {
            sub: 'ta1',
            name: 'tenant-admin1',
            role: 'TENANT_ADMIN',
            iat: 1337,
            tenant: 't1',
            permissions: ['tenant.all'],
        },
    },
    tenantUser1: {
        token: 'tenantUser1',
        value: {
            sub: 'tu1',
            name: 'tenant-user1',
            iat: 1337,
            tenant: 't1',
            permissions: [],
        },
    },
    tenantUser11: {
        token: 'tenantUser11',
        value: {
            sub: 'tu11',
            name: 'tenant-user11',
            iat: 1337,
            tenant: 't1',
            permissions: [],
        },
    },

    tenantAdmin2: {
        token: 'tenantAdmin2',
        value: {
            sub: 'ta2',
            name: 'tenant-admin2',
            iat: 1337,
            tenant: 't2',
            permissions: ['tenant.all'],
        },
    },

    tenantAdmin22: {
        token: 'tenantAdmin22',
        value: {
            sub: 'ta22',
            name: 'tenant-admin22',
            iat: 1337,
            tenant: 't2',
            permissions: ['tenant.all'],
        },
    },
    tenantUser2: {
        token: 'tenantUser2',
        value: {
            sub: 'tu2',
            name: 'tenant-user2',
            role: 'USER',
            iat: 1337,
            tenant: 't2',
            permissions: [],
        },
    },

    tenantUser22: {
        token: 'tenantUser22',
        value: {
            sub: 'tu22',
            name: 'tenant-user22',
            role: 'USER',
            iat: 1337,
            tenant: 't2',
            permissions: [],
        },
    },
};
