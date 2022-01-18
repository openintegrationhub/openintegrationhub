// General configuration file for variable urls, settings, etc.

const general = {
  mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/flowRepoDev',
  amqpUrl: process.env.QUEUE_URL || 'amqp://guest:guest@localhost:5672',
  gdprEventName: 'iam.user.deleted',

  flowReadPermission: process.env.FLOW_READ_PERMISSION || 'flows.read',
  flowWritePermission: process.env.FLOW_WRITE_PERMISSION || 'flows.write',
  flowControlPermission: process.env.FLOW_CONTROL_PERMISSION || 'flows.control',

  originWhitelist: process.env.ORIGINWHITELIST ? process.env.ORIGINWHITELIST.split(',') : [],

  // Designates which storage system (Mongo, Kubernetes, MySQL, etc.) is used
  storage: 'mongo',
  minSimilarityScore: process.env.SMART_ASSISTANCE_MIN_SIMILARITY_SCORE || 0.4,
  loggingServiceBaseUrl: process.env.LOGGING_SERVICE_BASE_URL || 'http://logging-service.oih-dev-ns.svc.cluster.local:1234',
};

module.exports = general;
