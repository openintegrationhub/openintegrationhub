module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "prettier"],
  extends: [
    "plugin:@typescript-eslint/recommended", // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    "prettier/@typescript-eslint",
    "plugin:prettier/recommended",
  ],
  rules: {
    "@typescript-eslint/ban-types": 1,
    // "@typescript-eslint/no-empty-function": 1,
  },
};
