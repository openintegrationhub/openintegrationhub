module.exports =  {
    parser:  '@typescript-eslint/parser',  // Specifies the ESLint parser
    extends:  [
        'plugin:@typescript-eslint/recommended',  // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    ],
    parserOptions:  {
        ecmaVersion:  2018,  // Allows for the parsing of modern ECMAScript features
        sourceType:  'module',  // Allows for the use of imports
    },
    rules:  {
        '@typescript-eslint/no-angle-bracket-type-assertion': 'off',
        '@typescript-eslint/interface-name-prefix': ['error', 'always'],
        '@typescript-eslint/interface-name-prefix': ['error', 'always'],
        '@typescript-eslint/ban-ts-comment': 0
    },
};
