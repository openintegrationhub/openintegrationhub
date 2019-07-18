module.exports = {

  adminToken: {
    token: 'adminToken',
    value: {
      sub: 'TestAdmin',
      username: 'admin@example.com',
      role: 'ADMIN',
      memberships: [],
      iat: 1337,
    },
  },

  userToken: {
    token: 'userToken',
    value: {
      sub: 'TestUser',
      username: 'user@example.com',
      role: 'USER',
      memberships: [
        {
          role: 'TENANT_GUEST',
          tenant: '2',
          permissions: ['logs.read', 'logs.push'],
          active: true,
        },
      ],
      iat: 1337,
    },
  },

  guestToken: {
    token: 'guestToken',
    value: {
      sub: 'TestGuest',
      username: 'guest@example.com',
      role: 'GUEST',
      memberships: [
        {
          permissions: ['logs.read', 'logs.push'],
          role: 'TENANT_GUEST',
          tenant: '3',
          active: true,
        },
      ],
      iat: 1337,
    },
  },

};
