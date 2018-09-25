// General configuration file for variable urls, settings, etc.

const general = {
    iamBaseUrl: 'http://192.168.42.3:3099',
    iamApiBaseUrl: 'http://192.168.42.3:3099',
    mongoUrl: 'mongodb://mongo:27017/icr',

    // Designates which storage system (Mongo, Kubernetes, MySQL, etc.) is used
    storage: 'mongo'
};

module.exports = general;
