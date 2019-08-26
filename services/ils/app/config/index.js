// General configuration file for variable urls, settings, etc.

const general = {
  mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/ilsDev', //
  // amqpUrl: process.env.QUEUE_URL || 'amqp://guest:guest@localhost:5672',
  // oihViewerRoles: ['ADMIN'],
  // tenantWriterRoles: ['TENANT_ADMIN', 'TENANT_INTEGRATOR'],

  // Determines whether the IAM-permission system should be used. Set to true to enable
  // usePermissions: process.env.USE_PERMISSIONS || false,
  // flowReadPermission: process.env.FLOW_READ_PERMISSION || 'flows.read',
  // flowWritePermission: process.env.FLOW_WRITE_PERMISSION || 'flows.write',

  // Designates which storage system (Mongo, Kubernetes, MySQL, etc.) is used
  // storage: 'mongo',
};

module.exports = general;
