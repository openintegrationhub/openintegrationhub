module.exports = {
  globalSetup: './test/utils/setup.js',
  globalTeardown: './test/utils/teardown.js',
  testEnvironment: './test/utils/mongo-environment.js',
  testRegex: ['test.js', '.spec.js'],
};
