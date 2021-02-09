const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.test') });
const fs = require('fs');
const MongodbMemoryServer = require('mongodb-memory-server');

const globalConfigPath = path.join(__dirname, 'globalConfig.json');

const mongod = new MongodbMemoryServer.default({
    instance: {
        dbName: 'jest',
    },
    binary: {
        version: '3.6.17',
    },
    autoStart: false,
});

module.exports = async () => {
    if (!mongod.isRunning) {
        await mongod.start();
    }

    const mongoConfig = {
        mongoDBName: 'jest',
        mongoUri: await mongod.getConnectionString(),
    };

    // Write global config to disk because all tests run in different contexts.
    fs.writeFileSync(globalConfigPath, JSON.stringify(mongoConfig));
    console.log('Config is written');

    // Set reference to mongod in order to close the server during teardown.
    global.__MONGOD__ = mongod;
    process.env.MONGO_URL = mongoConfig.mongoUri;
};
