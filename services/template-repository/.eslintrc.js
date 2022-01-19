module.exports = {
  rules: {
    'no-console': 'off',
    'prefer-destructuring': 'off',
    'no-async-promise-executor': 0,
    'no-underscore-dangle': 0,
  },
  env: {
    node: true,
    mocha: true,
    'jest/globals': true,
  },
  plugins: [
    'json',
    'mocha',
    'jest',
  ],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  extends: 'airbnb-base',
};
