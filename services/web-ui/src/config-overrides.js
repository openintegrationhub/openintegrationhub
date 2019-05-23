const rewireReactHotLoader = require('react-app-rewire-hot-loader');

/* config-overrides.js */
module.exports = function override(config, env) {
    config = rewireReactHotLoader(config, env); // eslint-disable-line no-param-reassign
    return config;
};
