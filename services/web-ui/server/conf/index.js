const { optional } = require('./check-env');
const { version, name } = require('../../package.json');

module.exports = {
    port: optional('PORT', 9090),
    logging: {
        namespace: optional('LOGGING_NAMESPACE', name),
    },
    endpoints: {
        iam: optional('ENDPOINT_IAM', 'https://iam.openintegrationhub.com'),
        flow: optional('ENDPOINT_FLOW', 'https://flow-repository.openintegrationhub.com'),
        component: optional('ENDPOINT_COMPONENT', 'https://component-repository.openintegrationhub.com'),
        metadata: optional('ENDPOINT_METADATA', 'https://metadata.openintegrationhub.com/api/v1'),
        appDirectory: optional('ENDPOINT_APP_DIRECTORY', 'https://app-directory.openintegrationhub.com/api/v1'),
        secrets: optional('ENDPOINT_SECRETS', 'https://skm.openintegrationhub.com/api/v1'),
    },
    wellKnown: {
        version,
    },
};
