// General configuration file for variable urls, settings, etc.

const general = {
  mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/flowRepoDev',
  amqpUrl: process.env.QUEUE_URL || 'amqp://guest:guest@localhost:5672',
  gdprEventName: 'iam.user.deleted',

  ProvenanceEventReadPermission: process.env.PROVENANCE_READ_PERMISSION || 'provenance.read',

  originWhitelist: process.env.ORIGINWHITELIST ? process.env.ORIGINWHITELIST.split(',') : [],

  // Designates which storage system (Mongo, Kubernetes, MySQL, etc.) is used
  storage: 'mongo',

  loggingServiceBaseUrl: process.env.LOGGING_SERVICE_BASE_URL || 'http://logging-service.oih-dev-ns.svc.cluster.local:1234',
  flowRepoUrl: process.env.FLOW_REPO_BASE_URL || 'http://flow-repository.oih-dev-ns.svc.cluster.local:3001',
  dataHubUrl: process.env.DATA_HUB_BASE_URL || 'http://data-hub-service.oih-dev-ns.svc.cluster.local:1234',

  governanceServiceBaseUrl: process.env.GOVERNANCE_SERVICE_BASE_URL || 'http://localhost:3009',
};

module.exports = general;
