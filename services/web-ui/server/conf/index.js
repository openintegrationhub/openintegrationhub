const { optional } = require('./check-env');
const { version, name } = require('../../package.json');

module.exports = {
    port: optional('PORT', 9090),
    logging: {
        namespace: optional('LOGGING_NAMESPACE', name),
    },
    wellKnown: {
        version,
    },
};
