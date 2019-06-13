const NodeEnvironment = require('jest-environment-node');
const path = require('path');
const fs = require('fs');
const {
    user1,
    user2,
    admin,
} = require('./tokens');

const globalConfigPath = path.join(__dirname, 'globalConfig.json');

module.exports = class MongoEnvironment extends NodeEnvironment {
    async setup() {
        console.log('Setup MongoDB Test Environment');

        const globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'));

        this.global.__MONGO_URI__ = globalConfig.mongoUri;
        this.global.__MONGO_DB_NAME__ = globalConfig.mongoDBName;

        // setup auth header
        this.global.user1 = ['Authorization', `bearer ${user1.token}`];
        this.global.user2 = ['Authorization', `bearer ${user2.token}`];
        this.global.admin = ['Authorization', `bearer ${admin.token}`];

        await super.setup();
    }

    async teardown() {
        console.log('Teardown MongoDB Test Environment');

        await super.teardown();
    }

    runScript(script) {
        return super.runScript(script);
    }
};
