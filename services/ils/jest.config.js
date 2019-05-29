module.exports = {
  verbose: true,
  testEnvironment: 'node',
  collectCoverageFrom: [
    'app/**/*.{js}',
    '!<rootDir>/app/config/logger.js',
    '!<rootDir>/app/index.js',
  ],
};
