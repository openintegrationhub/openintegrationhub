/* eslint no-underscore-dangle: "off" */
/* eslint no-useless-constructor: "off" */

const NodeEnvironment = require('jest-environment-node');
const path = require('path');
const fs = require('fs');

const globalConfigPath = path.join(__dirname, 'globalConfig.json');

module.exports = class MongoEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config);
  }

  async setup() {
    console.log('Setup MongoDB Test Environment');

    const globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'));

    this.global.__MONGO_URI__ = globalConfig.mongoUri;
    this.global.__MONGO_DB_NAME__ = globalConfig.mongoDBName;

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
