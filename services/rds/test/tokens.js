const mongoose = require('mongoose')
const iamLib = require('@openintegrationhub/iam-utils')

const t1 = new mongoose.Types.ObjectId()
const t2 = new mongoose.Types.ObjectId()

module.exports = {
  adminToken1: {
    token: 'adminToken1',
    value: {
      sub: 'a1',
      _id: new mongoose.Types.ObjectId(),
      username: 'Admin1@basaas.com',
      role: 'ADMIN',
      firstname: 'Userxx',
      lastname: 'Useryy',
      // memberships: ['t1', 't2'],
      tenant: t1,
      permissions: ['all'],
      iat: 1337,
    },
  },

  userToken1: {
    token: 'userToken1',
    value: {
      sub: 'u2',
      _id: new mongoose.Types.ObjectId(),
      username: 'User2@basaas.de',
      role: 'USER',
      firstname: 'Userxx',
      lastname: 'Useryy',
      tenant: t1,
      iat: 1337,
    },
  },

  tenantAdminToken1: {
    token: 'tenantAdminToken1',
    value: {
      sub: 'ta1',
      _id: new mongoose.Types.ObjectId(),
      username: 'ta1@basaas.de',
      role: 'TENANT_ADMIN',
      firstname: 'Userxx1',
      lastname: 'Useryy1',
      permissions: ['tenant.all'],
      tenant: t1,
      iat: 1337,
    },
  },

  adminToken2: {
    token: 'adminToken2',
    value: {
      sub: 'a3',
      _id: new mongoose.Types.ObjectId(),
      username: 'Admin3@basaas.com',
      firstname: 'Userxx',
      lastname: 'Useryy',
      role: 'ADMIN',
      tenant: t2,
      iat: 1337,
    },
  },

  userToken2: {
    token: 'userToken2',
    value: {
      sub: 'u4',
      _id: new mongoose.Types.ObjectId(),
      username: 'User4@basaas.de',
      firstname: 'Userxx',
      lastname: 'Useryy',
      role: 'NOT_USER',
      permissions: [iamLib.PERMISSIONS.common['rds.rawRecord.read']],
      tenant: t2,
      iat: 1337,
    },
  },

  userToken3: {
    token: 'userToken3',
    value: {
      sub: 'u44',
      _id: new mongoose.Types.ObjectId(),
      username: 'User44@basaas.de',
      firstname: 'Userxx',
      lastname: 'Useryy',
      role: 'USER',
      permissions: [iamLib.PERMISSIONS.common['rds.rawRecord.read']],
      tenant: t2,
      iat: 1337,
    },
  },
}
