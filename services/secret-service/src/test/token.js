const jwt = require('jsonwebtoken');

module.exports = {

    adminToken1: jwt.sign({
        sub: 'u1',
        name: 'Admin1',
        role: 'ADMIN',
        memberships: ['t1', 't2'],
        iat: 1337,
    }, 'shhhhh'),

    userToken1: jwt.sign({
        sub: 'u2',
        name: 'User1',
        role: 'USER',
        memberships: ['t1'],
        iat: 1337,
    }, 'shhhhh'),

    adminToken2: jwt.sign({
        sub: 'u3',
        name: 'Admin2',
        role: 'ADMIN',
        memberships: ['t2'],
        iat: 1337,
    }, 'shhhhh'),

    userToken2: jwt.sign({
        sub: 'u4',
        name: 'User2',
        role: 'NOT_USER',
        memberships: ['t2'],
        iat: 1337,
    }, 'shhhhh'),

};
