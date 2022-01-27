const config = require('../../../../../src/config');

const tenantId = '60f922418ced69c612df63ff';

module.exports = {
  tenantId,
  adminToken: {
    token: 'adminToken',
    value: {
      sub: 'TestAdmin',
      username: 'admin@example.com',
      role: 'ADMIN',
      permissions: ['all'],
      iat: 1337,
      isAdmin: true
    },
  },

  permitToken: {
    token: 'permitToken',
    value: {
      sub: 'PermitGuy',
      username: 'admin@example.com',
      permissions: [
        config.componentsCreatePermission,
        config.componentsUpdatePermission,
        config.componentDeletePermission,
      ],
      tenant: tenantId,
      iat: 1337,
    },
  },

  unpermitToken: {
    token: 'unpermitToken',
    value: {
      sub: 'UnpermitGuy',
      username: 'guest@example.com',
      tenant: tenantId,
      permissions: ['müsli.riegel', 'schoko.riegel'],
      iat: 1337,
    },
  },

  partpermitToken: {
    token: 'partpermitToken',
    value: {
      sub: 'PartpermitGuy',
      username: 'guest@example.com',
      tenant: tenantId,
      permissions: ['flows.read', 'templates.read', 'schoko.riegel'],
      iat: 1337,
    },
  },
};
