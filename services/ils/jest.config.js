module.exports = {
  verbose: true,
  globalSetup: './test/utils/setup.js',
  globalTeardown: './test/utils/teardown.js',
  testEnvironment: './test/utils/mongo-environment.js',
  testRegex: "(/__test__/.*|(\\.|/)(test|spec))\\.[jt]sx?$",
  collectCoverageFrom: [
    'app/**/*.{js}',
    '!<rootDir>/app/config/logger.js',
    '!<rootDir>/app/index.js',
  ],
};
