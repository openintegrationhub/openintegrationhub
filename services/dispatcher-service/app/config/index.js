// General configuration file for variable urls, settings, etc.

const general = {
  mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/dispatcherDev',
  amqpUrl: process.env.QUEUE_URL || 'amqp://guest:guest@localhost:5672',
  incomingEventName: process.env.EVENT_NAME || 'datahub.dispatch',
  flowRepoUrl: process.env.FLOWREPO_URL || 'http://localhost:3001',
  flowToken: process.env.FLOW_TOKEN || 'exampleToken',
};

module.exports = general;
