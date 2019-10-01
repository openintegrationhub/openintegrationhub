const NodeEnvironment = require('jest-environment-node');
const path = require('path');
const fs = require('fs');
const {
    user1,
    user2,
    user3,
    admin,
    tenantAdmin1,
    tenantAdmin2,
    tenantAdmin22,
    tenantUser1,
    tenantUser11,
    tenantUser2,
    tenantUser22,
} = require('./tokens');

const globalConfigPath = path.join(__dirname, 'globalConfig.json');

module.exports = class MongoEnvironment extends NodeEnvironment {
    async setup() {
        const globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'));

        this.global.__MONGO_URI__ = globalConfig.mongoUri;
        this.global.__MONGO_DB_NAME__ = globalConfig.mongoDBName;

        // setup auth header
        this.global.user1 = ['Authorization', `bearer ${user1.token}`];
        this.global.user2 = ['Authorization', `bearer ${user2.token}`];
        this.global.user3 = ['Authorization', `bearer ${user3.token}`];
        this.global.admin = ['Authorization', `bearer ${admin.token}`];

        this.global.tenantAdmin1 = ['Authorization', `bearer ${tenantAdmin1.token}`];
        this.global.tenantUser1 = ['Authorization', `bearer ${tenantUser1.token}`];
        this.global.tenantUser11 = ['Authorization', `bearer ${tenantUser11.token}`];

        this.global.tenantAdmin2 = ['Authorization', `bearer ${tenantAdmin2.token}`];
        this.global.tenantAdmin22 = ['Authorization', `bearer ${tenantAdmin22.token}`];
        this.global.tenantUser2 = ['Authorization', `bearer ${tenantUser2.token}`];
        this.global.tenantUser22 = ['Authorization', `bearer ${tenantUser22.token}`];

        await super.setup();
    }

    async teardown() {
        await super.teardown();
    }

    runScript(script) {
        return super.runScript(script);
    }
};
