module.exports = {
  "rules": {
    "no-console": "off",
    "prefer-destructuring": "off",
    },
  "env": {
      es6: true,
      node: true,
      mocha: true
  },
  "plugins": [
      "json",
      "mocha"
  ],
  "parserOptions": {
      "ecmaVersion": 8,
      "sourceType": "module"
  },
  "extends": "airbnb-base"
}
