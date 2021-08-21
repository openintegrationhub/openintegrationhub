module.exports = {
    globalSetup: './test/setup.js',
    globalTeardown: './test/teardown.js',
    testEnvironment: './test/mongo-environment.js',
    setupFilesAfterEnv: [
        './test/jest.setup.js',
    ],
    silent: false,
    verbose: true,
};
