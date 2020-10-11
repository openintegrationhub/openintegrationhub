// General configuration file for variable urls, settings, etc.

const general = {
  mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/templateRepoDev',
  amqpUrl: process.env.QUEUE_URL || 'amqp://guest:guest@localhost:5672',
  iamToken: process.env.IAM_TOKEN,
  flowRepositoryBaseUrl: process.env.FLOWREPO_URL || 'http://flow-repository.oih-dev-ns.svc.cluster.local:3001',
  // "IAM_BASE_URL": "http://iam.oih-dev-ns.svc.cluster.local:3099/api/v1",
  gdprEventName: 'iam.user.deleted',

  flowTemplateReadPermission: process.env.FLOW_TEMPLATE_READ_PERMISSION || 'templates.read',
  flowTemplateWritePermission: process.env.FLOW_TEMPLATE_WRITE_PERMISSION || 'templates.write',
  flowTemplateControlPermission: process.env.FLOW_TEMPLATE_CONTROL_PERMISSION || 'templates.control',
  flowWritePermission: process.env.FLOW_WRITE_PERMISSION || 'flows.write',
  originWhitelist: process.env.ORIGINWHITELIST ? process.env.ORIGINWHITELIST.split(',') : [],

  // Designates which storage system (Mongo, Kubernetes, MySQL, etc.) is used
  storage: 'mongo',

  loggingServiceBaseUrl: process.env.LOGGING_SERVICE_BASE_URL || 'http://logging-service.oih-dev-ns.svc.cluster.local:1234',
};

module.exports = general;
