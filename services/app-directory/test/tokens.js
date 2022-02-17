const permissions = require('../src/constant/permission');
const mongoose = require('mongoose');

module.exports = {

    adminToken1: {
        token: 'adminToken1',
        value: {
            sub: 'a1',
            name: 'Admin1',
            permissions: ['all'],
            iat: 1337,
        },
    },

    userToken1: {
        token: 'userToken1',
        value: {
            sub: 'u2',
            name: 'User2',
            role: 'USER',
            iat: 1337,
            tenant: '5c507eb60838f1f976e5f2a4',
            permissions: [
                'tenant.all',
            ],
        },
    },

    userAuth1SecondUser: {
        token: 'userAuth1SecondUser',
        value: {
            sub: 'u22',
            name: 'User22',
            role: 'USER',
            iat: 1337,
            tenant: '5c507eb60838f1f976e5f2a4',
            permissions: [],
        },
    },

    userToken1ExtraPerm: {
        token: 'userToken1ExtraPerm',
        value: {
            sub: 'u2',
            name: 'User2',
            role: 'USER',
            iat: 1337,
            tenant: '5c507eb60838f1f976e5f2a4',
            permissions: [
                'tenant.all',
                permissions.common.secretReadRaw,
            ],
        },

    },

    serviceAccount: {
        token: 'serviceAccount',
        value: {
            sub: 's1',
            name: 'Service Account',
            permissions: [
                permissions.restricted.secretDeleteAny,
                permissions.restricted.authClientDeleteAny,
            ],
            iat: 1337,
        },

    },

    connectorToken: {
        token: 'connectorToken',
        value: {
            sub: 'u2',
            name: 'User2',
            role: 'EPHEMERAL_SERVICE_ACCOUNT',
            permissions: [
                permissions.common.secretReadRaw,
            ],
            iat: 1337,
        },
    },

    adminToken2: {
        token: 'adminToken2',
        value: {
            sub: 'a3',
            name: 'Admin3',
            permissions: ['all'],
            iat: 1337,
        },
    },

    userToken2: {
        token: 'userToken2',
        value: {
            sub: 'u4',
            name: 'User4',
            role: 'NOT_USER',
            iat: 1337,
            tenant: new mongoose.types.ObjectId(),
        },
    },

    userFork: {
        token: 'userFork',
        value: {
            sub: 'userFork',
            name: 'User Fork',
            role: 'USER',
            iat: 1337,
        },
    },
};
