module.exports = {
  rules: {
    'no-console': 'off',
    'prefer-destructuring': 'off',
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
    ecmaVersion: 8,
    sourceType: 'module',
  },
  extends: 'airbnb-base',
};
