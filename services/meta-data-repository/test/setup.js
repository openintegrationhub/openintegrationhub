const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.test') });
const fs = require('fs');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const globalConfigPath = path.join(__dirname, 'globalConfig.json');

const dbName = 'changeme';
const setName = 'jestset';

const mongod = new MongoMemoryReplSet({
    binary: {
        version: '4.0.16',
    },
    instanceOpts: [
        { storageEngine: 'wiredTiger' },
        { storageEngine: 'wiredTiger' },
    ],
    replSet: {
        dbName,
        name: setName,
    },
    // debug: true,
    autoStart: false,
});

module.exports = async () => {
    if (!mongod.isRunning) {
        await mongod.start();
        await mongod.waitUntilRunning();
    }

    const mongoConfig = {
        mongoDBName: dbName,
        mongoUri: `${await mongod.getConnectionString()}?replicaSet=${setName}`,
    };

    // Write global config to disk because all tests run in different contexts.
    fs.writeFileSync(globalConfigPath, JSON.stringify(mongoConfig));
    console.log('Config is written');

    // Set reference to mongod in order to close the server during teardown.
    global.__MONGOD__ = mongod;
    process.env.MONGO_URL = mongoConfig.mongoUri;
};
