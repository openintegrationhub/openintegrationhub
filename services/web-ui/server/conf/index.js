const { optional } = require('./check-env');
const { version, name } = require('../../package.json');

module.exports = {
    port: optional('PORT', 9090),
    logging: {
        namespace: optional('LOGGING_NAMESPACE', name),
    },
    endpoints: {
        iam: optional('ENDPOINT_IAM', 'http://iam.openintegrationhub.com'),
        flow: optional('ENDPOINT_FLOW', 'http://flow-repository.openintegrationhub.com'),
    },
    wellKnown: {
        version,
    },
};
