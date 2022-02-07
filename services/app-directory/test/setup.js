const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.test') });

const fs = require('fs');
const { MongoMemoryReplSet } = require("mongodb-memory-server") // eslint-disable-line

const globalConfigPath = path.join(__dirname, 'globalConfig.json');

const downloadDir = process.env.BINARY_DOWNLOAD_DIR;

const dbName = 'changeme';

module.exports = async () => {
    const replSet = await MongoMemoryReplSet.create(
        {
            binary: {
                version: '4.4.8',
                ...(downloadDir ? {
                    downloadDir,
                }
                    : {}
                ),
            },
            // unless otherwise noted below these values will be in common with all instances spawned:
            replSet: {
                count: 3, // number of additional `mongod` processes to start (will not start any extra if instanceOpts.length > replSet.count); (default: 1)
                dbName, // default database for db URI strings. (default: uuid.v4())
                storageEngine: 'wiredTiger',
            },
        },
    );

    // await replSet.waitUntilRunning();

    const uri = `${await replSet.getUri(dbName)}&retryWrites=true&w=majority`;

    const mongoConfig = {
        mongoDBName: dbName,
        mongoUri: uri,
    };

    global.__MONGOD__ = replSet;
    process.env.MONGO_URL = mongoConfig.mongoUri;

    // Write global config to disk because all tests run in different contexts.
    fs.writeFileSync(globalConfigPath, JSON.stringify(mongoConfig));
    console.log('Config is written');
};
