// General configuration file for variable urls, settings, etc.

const general = {
  mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/auditLogDev',
  oihViewerRoles: ['ADMIN'],

  // Determines whether the IAM-permission system should be used. Set to true to enable
  usePermissions: process.env.USE_PERMISSIONS || false,
  logReadPermission: process.env.FLOW_READ_PERMISSION || 'logs.read',

  // Designates which storage system (Mongo, Kubernetes, MySQL, etc.) is used
  storage: 'mongo',

  amqpUrl: process.env.QUEUE_URL || 'amqp://guest:guest@localhost:5672',
  exchangeName: process.env.EXCHANGE_NAME || 'audit-logs',
  exchangeTopic: process.env.EXCHANGE_TOPIC || 'logs',
};

module.exports = general;
