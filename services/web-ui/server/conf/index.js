const { optional } = require('./check-env');
const { version, name } = require('../../package.json');

module.exports = {
    port: optional('PORT', 9090),
    logging: {
        namespace: optional('LOGGING_NAMESPACE', name),
    },
    endpoints: {
        iam: optional('ENDPOINT_IAM', /* 'https://localhost:3099'*/ 'https://iam.openintegrationhub.com' ),
        flow: optional('ENDPOINT_FLOW', 'https://flow-repository.openintegrationhub.com'),
        component: optional('ENDPOINT_COMPONENT', 'https://component-repository.openintegrationhub.com'),
        metadata: optional('ENDPOINT_METADATA', 'https://metadata.openintegrationhub.com/api/v1'),
        appDirectory: optional('ENDPOINT_APP_DIRECTORY', 'https://app-directory.openintegrationhub.com/api/v1'),
        dispatcher: optional('ENDPOINT_DISPATCHER', 'https://dispatcher-service.openintegrationhub.com'),
        secrets: optional('ENDPOINT_SECRETS', 'https://skm.openintegrationhub.com/api/v1'),
        webhooks: optional('ENDPOINT_WEBHOOKS', 'https://webhooks.openintegrationhub.com'),
        dataHub: optional('ENDPOINT_DATA_HUB', 'https://data-hub.openintegrationhub.com/api/v1'),
        rds: optional('ENDPOINT_RDS', 'https://rds.openintegrationhub.com/api/v1'),
    },
    misc: {
        reports: {
            img1: optional('REPORTS_IMG1', 'https://reports-analytics.openintegrationhub.com/grafana-proxy/render/d-solo/apSj8axZk/overview?orgId=1&from=$(FROM)&to=now&theme=dark&panelId=4&width=1400&height=700&tz=Europe%2FBerlin'),
            img2: optional('REPORTS_IMG2', 'https://reports-analytics.openintegrationhub.com/grafana-proxy/render/d-solo/apSj8axZk/overview?orgId=1&from=$(FROM)&to=now&theme=dark&panelId=2&width=1400&height=700&tz=Europe%2FBerlin'),
            serviceUi: optional('REPORTS_UI', 'https://grafana.openintegrationhub.com/d/apSj8axZk/overview?orgId=1'),
        },
    },
    wellKnown: {
        version,
    },
};
