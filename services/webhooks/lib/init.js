const path = require('path');
const { amqp, mongo, errorHandlers } = require('@elastic.io/commons');
const Config = require('./Config');
const services = {};

async function mongoConnect(mongoUri) {
    const connection = await mongo.connect(mongoUri);

    //@todo: get rid of this https://github.com/elasticio/webhooks/issues/59
    if (process.env.NODE_ENV !== 'test') {
        errorHandlers.mongodbDisconnect(connection);
    }

    return connection;
}

//eslint-disable-next-line no-unused-vars
async function amqpConnect(amqpUri) {
    //amqp connect nonstandart calling convention
    const connection = await new Promise(amqp.connect);

    //@todo: get rid of this https://github.com/elasticio/webhooks/issues/59
    if (process.env.NODE_ENV !== 'test') {
        errorHandlers.rabbitmqDisconnect(connection);
    }

    return connection;
}

exports.init = async function initConnections() {
    services.config = new Config(path.resolve(__dirname, '../.eio-config.json'));
    await services.config.init();
    services.mongoConnection = await mongoConnect(services.config.get('MONGO_URI'));
    services.amqpConnection = await amqpConnect(services.config.get('AMQP_URI'));
};

exports.getConfig = function getConfig() {
    return services.config;
};

exports.getAmqpConnection = function getAmqpConnection() {
    return services.amqpConnection;
};

exports.getMongoConnection = function getMongoConnection() {
    return services.mongoConnection;
};

exports.amqpConnect = amqpConnect;
exports.mongo = mongoConnect;

errorHandlers.onUncaughtException();
