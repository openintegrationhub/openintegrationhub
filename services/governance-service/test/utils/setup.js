/* eslint no-underscore-dangle: "off" */
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.test') });
const fs = require('fs');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const globalConfigPath = path.join(__dirname, 'globalConfig.json');

const replSet = new MongoMemoryReplSet({
  replSet: { storageEngine: 'wiredTiger' },
  instance: {
    dbName: 'jest',
  },
  binary: {
    version: 'latest',
  },
});

module.exports = async () => {
  // if (!mongod.isRunning) {
  //     await mongod.start();
  // }

  await replSet.waitUntilRunning();

  const mongoConfig = {
    mongoDBName: 'jest',
    mongoUri: await replSet.getUri(),
  };

  // Write global config to disk because all tests run in different contexts.
  fs.writeFileSync(globalConfigPath, JSON.stringify(mongoConfig));
  console.log('Config is written');

  // Set reference to mongod in order to close the server during teardown.
  global.__MONGOD__ = replSet;
  process.env.MONGO_URL = mongoConfig.mongoUri;
};
