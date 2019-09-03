const NodeEnvironment = require('jest-environment-node');
const path = require('path');
const fs = require('fs');
const {
    userToken1,
    userAuth1SecondUser,
    adminToken1,
    adminToken2,
    userToken2,
    userFork,
    connectorToken,
    userToken1ExtraPerm,
    serviceAccount,
} = require('./tokens');

const globalConfigPath = path.join(__dirname, 'globalConfig.json');

module.exports = class MongoEnvironment extends NodeEnvironment {
    async setup() {
        console.log('Setup MongoDB Test Environment');

        const globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'));

        this.global.__MONGO_URI__ = globalConfig.mongoUri;
        this.global.__MONGO_DB_NAME__ = globalConfig.mongoDBName;

        // setup auth header
        this.global.adminAuth1 = ['Authorization', `bearer ${adminToken1.token}`];
        this.global.userAuth1 = ['Authorization', `bearer ${userToken1.token}`];
        this.global.userAuth1SecondUser = ['Authorization', `bearer ${userAuth1SecondUser.token}`];
        this.global.userToken1ExtraPerm = ['Authorization', `bearer ${userToken1ExtraPerm.token}`];

        this.global.adminAuth2 = ['Authorization', `bearer ${adminToken2.token}`];
        this.global.userAuth2 = ['Authorization', `bearer ${userToken2.token}`];

        this.global.userFork = ['Authorization', `bearer ${userFork.token}`];
        this.global.connector = ['Authorization', `bearer ${connectorToken.token}`];
        this.global.serviceAccount = ['Authorization', `bearer ${serviceAccount.token}`];

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
