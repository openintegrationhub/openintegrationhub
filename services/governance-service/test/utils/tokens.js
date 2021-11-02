module.exports = {

  adminToken: {
    token: 'adminToken',
    value: {
      sub: 'TestAdmin',
      username: 'admin@example.com',
      role: 'ADMIN',
      permissions: ['all'],
      isAdmin: true,
      iat: 1337,
    },
  },

  guestToken: {
    token: 'guestToken',
    value: {
      sub: 'TestGuest',
      username: 'guest@example.com',
      permissions: [],
      tenant: 'testTenant1',
      iat: 1337,
      aud: 'Test_Audience',
      iss: 'Test_Issuer',
    },
  },

  permitToken: {
    token: 'permitToken',
    value: {
      sub: 'PermitGuy',
      username: 'admin@example.com',
      permissions: ['tenant.all', 'provenance.read'],
      tenant: 'testTenant1',
      iat: 1337,
    },
  },

  denyToken: {
    token: 'unpermitToken',
    value: {
      sub: 'UnpermitGuy',
      username: 'guest@example.com',
      tenant: 'testTenant1',
      permissions: ['müsli.riegel', 'schoko.riegel'],
      iat: 1337,
    },
  },

  partpermitToken: {
    token: 'partpermitToken',
    value: {
      sub: 'PartpermitGuy',
      username: 'guest@example.com',
      tenant: 'testTenant1',
      permissions: [],
      iat: 1337,
    },
  },

};
