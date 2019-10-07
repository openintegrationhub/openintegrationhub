// General configuration file for variable urls, settings, etc.

const general = {
  mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/dispatcherDev',
  amqpUrl: process.env.QUEUE_URL || 'amqp://guest:guest@localhost:5672',
  incomingEventNames: process.env.EVENT_NAMES ? process.env.EVENT_NAMES.split(',') : ['data-hub.record.created', 'data-hub.record.updated'],
  flowRepoUrl: process.env.FLOWREPO_URL || 'http://localhost:3001',
  flowToken: process.env.FLOW_TOKEN || 'exampleToken',
};

module.exports = general;
