// General configuration file for variable urls, settings, etc.

const general = {
  mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/ilsDev',

  // Designates which storage system (Mongo, Kubernetes, MySQL, etc.) is used
  storage: 'mongo',
};

module.exports = general;
