module.exports = {
    globalSetup: './src/test/setup.js',
    globalTeardown: './src/test/teardown.js',
    testEnvironment: './src/test/mongo-environment.js',
    setupFilesAfterEnv: [
        './src/test/jest.setup.js',
    ],
    silent: false,
    verbose: true,
};
