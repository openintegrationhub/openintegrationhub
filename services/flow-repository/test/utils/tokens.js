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
      sub: 'TestGuest',
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

  permitToken: {
    token: 'permitToken',
    value: {
      sub: 'PermitGuy',
      username: 'admin@example.com',
      role: 'GUEST',
      permissions: ['flows.read', 'flows.write'],
      memberships: [
        {
          role: 'TENANT_ADMIN',
          tenant: 'testTenant1',
          permissions: ['flows.read', 'flows.write'],
        },
        {
          role: 'TENANT_ADMIN',
          tenant: 'testTenant2',
          permissions: ['flows.read', 'flows.write'],
        },
      ],
      iat: 1337,
    },
  },

  unpermitToken: {
    token: 'unpermitToken',
    value: {
      sub: 'UnpermitGuy',
      username: 'guest@example.com',
      role: 'GUEST',
      permissions: ['schoko.riegel'],
      memberships: [
        {
          role: 'TENANT_Guest',
          tenant: 'testTenant1',
          permissions: ['müsli.riegel'],
        },
      ],
      iat: 1337,
    },
  },

  partpermitToken: {
    token: 'partpermitToken',
    value: {
      sub: 'PartpermitGuy',
      username: 'guest@example.com',
      role: 'GUEST',
      permissions: ['schoko.riegel'],
      memberships: [
        {
          role: 'TENANT_Guest',
          tenant: 'testTenant1',
          permissions: ['flows.read'],
        },
      ],
      iat: 1337,
    },
  },


};
