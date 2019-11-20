const { events, EventBusManager } = require('@openintegrationhub/event-bus');
const mongoose = require('mongoose');
const logger = require('@basaas/node-logger');
const conf = require('../conf');

const log = logger.getLogger(`${conf.log.namespace}/server`);


module.exports = class Server {
    constructor({
        mongoDbConnection,
        eventBus,
    }) {
        this.eventBus = eventBus;
        this.mongoDbConnection = mongoDbConnection;
    }

    async setupDatabase() {
        const connectionString = this.mongoDbConnection
            || global.__MONGO_URI__
            || conf.mongoDbConnection;

        await mongoose.connect(connectionString, {
            poolSize: 50,
            socketTimeoutMS: 60000,
            connectTimeoutMS: 30000,
            keepAlive: 120,
            useCreateIndex: true,
            useNewUrlParser: true,
            useFindAndModify: false,
            useUnifiedTopology: true,
        });
    }

    async start() {
        // setup database

        await this.setupDatabase();
        EventBusManager.init({ eventBus: this.eventBus, serviceName: conf.loggingNameSpace });

        this.eventBus.subscribe(events['secrets.secret.created'], async (event) => {
            try {
                console.log(event);
                await event.ack();
            } catch (err) {
                logger.error('failed to delete domains on iam.tenant.deleted for event', event);
                logger.error(err);
            }
        });
    }

    async stop() {
        mongoose.connection.close();
        await EventBusManager.destroy();
    }
};
