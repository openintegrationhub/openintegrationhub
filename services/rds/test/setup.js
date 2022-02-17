const path = require('path')
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.test") }) // eslint-disable-line
const fs = require('fs')
const { MongoMemoryReplSet } = require("mongodb-memory-server") // eslint-disable-line

const globalConfigPath = path.join(__dirname, 'globalConfig.json')
const downloadDir = process.env.BINARY_DOWNLOAD_DIR

const dbName = 'changeme'
const setName = 'jestset'

module.exports = async () => {
  const replSet = await MongoMemoryReplSet.create({
    autoStart: true,
    binary: {
      version: '5.0.3',
      ...(downloadDir
        ? {
            downloadDir,
          }
        : {}),
    },
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger',
      setName,
      dbName,
    },
  })

  await replSet.waitUntilRunning()

  const uri = `${replSet.getUri(dbName)}&retryWrites=true&w=majority`

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
}
