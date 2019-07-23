module.exports = {
  verbose: true,
  globalSetup: './test/utils/setup.js',
  globalTeardown: './test/utils/teardown.js',
  testEnvironment: './test/utils/mongo-environment.js',
  testRegex: "./test/test.*.js$",
  collectCoverageFrom: [
    'app/**/*.{js}',
    '!<rootDir>/app/config/logger.js',
    '!<rootDir>/app/index.js',
  ],
};
