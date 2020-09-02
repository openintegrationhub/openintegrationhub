module.exports = {
  rules: {
    'no-console': 'off',
    "no-async-promise-executor": 0
  },
  env: {
    es6: true,
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
