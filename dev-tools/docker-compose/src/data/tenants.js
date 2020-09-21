module.exports = [
  {
    name: 'tenant1',
    confirmed: true,
    status: 'ACTIVE',
    users: [
      {
        status: 'ACTIVE',
        confirmed: true,
        role: 'TENANT_ADMIN',
        permissions: ['all'],
        username: 't1_admin@local.dev',
        password: 'password',
      },
    ],
  },
]
