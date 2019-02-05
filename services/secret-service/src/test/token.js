const jwt = require('jsonwebtoken');

module.exports = {

    adminToken1: jwt.sign({
        sub: 'a1',
        name: 'Admin1',
        role: 'ADMIN',
        memberships: ['t1', 't2'],
        iat: 1337,
    }, 'shhhhh'),

    userToken1: jwt.sign({
        sub: 'u2',
        name: 'User2',
        role: 'USER',
        memberships: [
            {
                tenant: '5c507eb60838f1f976e5f2a4',
                permissions: [
                    'tenant.all',
                ],
            },
        ],
        currentContext: {
            tenant: '5c507eb60838f1f976e5f2a4',
            permissions: [
                'tenant.all',
            ],
        },
        iat: 1337,
    }, 'shhhhh'),

    adminToken2: jwt.sign({
        sub: 'a3',
        name: 'Admin3',
        role: 'ADMIN',
        memberships: ['t2'],
        iat: 1337,
    }, 'shhhhh'),

    userToken2: jwt.sign({
        sub: 'u4',
        name: 'User4',
        role: 'NOT_USER',
        memberships: ['t2'],
        iat: 1337,
    }, 'shhhhh'),

    userFork: jwt.sign({
        sub: 'userFork',
        name: 'User Fork',
        role: 'USER',
        memberships: ['fork'],
        iat: 1337,
    }, 'shhhhh'),

};
