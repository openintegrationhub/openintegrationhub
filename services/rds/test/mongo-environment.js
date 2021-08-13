/* eslint import/no-extraneous-dependencies: 0 */

const NodeEnvironment = require('jest-environment-node')
const path = require('path')
const fs = require('fs')
const {
  adminToken1,
  userToken1,
  tenantAdminToken1,
  adminToken2,
  userToken2,
  userToken3,
} = require('./tokens')

const globalConfigPath = path.join(__dirname, 'globalConfig.json')

module.exports = class MongoEnvironment extends NodeEnvironment {
  async setup() {
    console.log('Setup MongoDB Test Environment')

    const globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'))

    this.global.__MONGO_URI__ = globalConfig.mongoUri

    // setup auth header
    this.global.adminAuth1 = ['Authorization', `Bearer ${adminToken1.token}`]
    this.global.userAuth1 = ['Authorization', `Bearer ${userToken1.token}`]
    this.global.tenantAdmin1 = [
      'Authorization',
      `Bearer ${tenantAdminToken1.token}`,
    ]

    this.global.adminAuth2 = ['Authorization', `Bearer ${adminToken2.token}`]
    this.global.userAuth2 = ['Authorization', `Bearer ${userToken2.token}`]
    this.global.userAuth3 = ['Authorization', `Bearer ${userToken3.token}`]

    await super.setup()
  }

  async teardown() {
    console.log('Teardown MongoDB Test Environment')

    await super.teardown()
  }

  runScript(script) {
    return super.runScript(script)
  }
}
