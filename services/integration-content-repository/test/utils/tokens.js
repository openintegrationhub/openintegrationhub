module.exports = {

  adminToken: {
    token: 'adminToken',
    value: {
      sub: 'TestAdmin',
      username: 'admin@example.com',
      role: 'ADMIN',
      memberships: [
        {
          role: 'TENANT_ADMIN',
          tenant: 'testTenant1',
        },
        {
          role: 'TENANT_ADMIN',
          tenant: 'testTenant2',
        },
      ],
      iat: 1337,
    },
  },

  guestToken: {
    token: 'guestToken',
    value: {
      username: 'guest@example.com',
      role: 'GUEST',
      memberships: [
        {
          role: 'TENANT_Guest',
          tenant: 'testTenant1',
        },
      ],
      iat: 1337,
      aud: 'Test_Audience',
      iss: 'Test_Issuer',
    },
  },


};
