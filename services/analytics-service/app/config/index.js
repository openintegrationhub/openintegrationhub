// General configuration file for variable urls, settings, etc.

const general = {
  mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/analyticsServiceDev',
  amqpUrl: process.env.QUEUE_URL || 'amqp://guest:guest@localhost:5672',

  originWhitelist: process.env.ORIGINWHITELIST ? process.env.ORIGINWHITELIST.split(',') : [],

  // Designates which storage system (Mongo, Kubernetes, MySQL, etc.) is used
  storage: 'mongo',

  loggingServiceUrl: process.env.LOGGING_SERVICE_BASE_URL || false,
  flowRepoUrl: process.env.FLOW_REPO_BASE_URL || false,
  templateRepoUrl: process.env.TEMPLATE_REPO_BASE_URL || false,
  governanceServiceUrl: process.env.GOVERNANCE_SERVICE_BASE_URL || false,
  dataHubUrl: process.env.DATA_HUB_BASE_URL || false,
  componentRepoUrl: process.env.COMPONENT_REPO_BASE_URL || false,
  iamUrl: process.env.IAM_BASE_URL || 'http://localhost:3099',
  timeWindows: {
    '15min': 15,
    hour: 60,
    day: 60 * 24,
    '30days': 60 * 24 * 30,
  },
  storageWindows: {
    '15min': 15 * 4 * 24,
    hour: 60 * 24,
    day: 60 * 24 * 30,
    '30days': 60 * 24 * 30 * 12,
  },
  smallestWindow: '15min',
  analyticsServiceBaseUrl: process.env.ANALYTICS_SERVICE_BASE_URL || 'http://localhost:3009',
  userRecentlyActivePeriod: process.env.USER_RECENT_ACTIVE_PERIOD || '7',
  userInactivePeriod: process.env.USER_INACTIVE_PERIOD || '60',
};

module.exports = general;
