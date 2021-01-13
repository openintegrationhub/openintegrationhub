/* eslint import/no-extraneous-dependencies: 0 */

const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.test') })
const { MongoMemoryReplSet } = require('mongodb-memory-server')

const globalConfigPath = path.join(__dirname, 'globalConfig.json')

const dbName = '_replace_me_'
const setName = 'jest-set'

const replSet = new MongoMemoryReplSet({
  autoStart: true,
  instanceOpts: [
    { storageEngine: 'wiredTiger' },
    { storageEngine: 'wiredTiger' },
  ],
  replSet: { dbName, name: setName },
})

module.exports = async () => {
  await replSet.waitUntilRunning()
  const uri = await replSet.getUri()

  // Set reference to mongod in order to close the server during teardown.
  global.__MONGOD__ = replSet
  process.env.MONGO_URL = uri

  // Write global config to disk because all tests run in different contexts.
  fs.writeFileSync(
    globalConfigPath,
    JSON.stringify({
      mongoUri: uri,
    })
  )
  console.log('Config is written')
}
