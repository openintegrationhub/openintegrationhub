const {
    EventBus, RabbitMqTransport,
} = require('@openintegrationhub/event-bus');
const mongoose = require('mongoose');
const logging = require('@basaas/node-logger');
const Influx = require('influx');
const conf = require('../conf');
const Measurement = require('../dao/measurement');
const { getValidMeasurements } = require('../validate');
const { transformMeasurement, transformEntries } = require('../transform');

const logger = logging.getLogger(`${conf.log.namespace}/server`);

const defaultSchema = {
    measurement: 'default',
    fields: {
        keyDefault: Influx.FieldType.STRING,
    },
    tags: [
        'event_name',
    ],
};

async function createCollections() {
    try {
        await Measurement.createCollection();
    } catch (err) {

    }
}

module.exports = class Server {
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

    async setupTimeseries(schemas) {
        console.log([
            defaultSchema,
            ...schemas,
        ]);
        this.influx = new Influx.InfluxDB({
            host: process.env.INFLUX_HOST,
            database: conf.influxDatabase,
            schema: [
                defaultSchema,
                ...schemas,
            ],
        });

        const dbs = await this.influx.getDatabaseNames();

        if (!dbs.includes(conf.influxDatabase)) {
            await this.influx.createDatabase(conf.influxDatabase);
        }
    }

    async setupListener() {
        const transport = new RabbitMqTransport({ rabbitmqUri: process.env.RABBITMQ_URI, logger });
        this.eventBus = new EventBus({
            transport, serviceName: conf.log.namespace,
        });

        this.eventBus.subscribe('#', async (event) => {
            try {
                console.log(event.name);
                await this.handleEvent(event);
            } catch (err) {
                logger.error(err);
            } finally {
                await event.ack();
            }
        });

        await this.eventBus.connect();
    }

    async writeTs(event, measurement) {
        try {
            const payload = [];

            // add default measurement
            payload.push({
                measurement: defaultSchema.measurement,
                fields: {
                    keyDefault: '.',
                },
                tags: {
                    event_name: event.name,
                },
            });

            if (measurement) {
                // add custom measurement if exists
                payload.push({
                    measurement: measurement.measurementName,
                    fields: transformEntries(measurement.payloadMapping.fields, event.payload),
                    tags: transformEntries(measurement.payloadMapping.tags, event.payload),
                });
            }
            console.log(`write ${  event.name}`);
            await this.influx.writePoints(payload);
        } catch (err) {
            logger.error(err);
        }
    }

    async handleEvent(event) {
        this.writeTs(event, this.eventMap.get(event.name));
    }

    async start() {
        try {
            // setup database
            await this.setupDatabase();
            await createCollections();

            // load valid measuremnts
            this.measurements = getValidMeasurements(await Measurement.get());
            this.eventMap = new Map(this.measurements.map((m) => [m.eventName, m]));

            if (process.env.INFLUX_HOST) {
                // register measurements
                await this.setupTimeseries(
                    this.measurements.map((m) => transformMeasurement(m)),
                );
            }

            if (process.env.RABBITMQ_URI) {
                // bind to queue
                await this.setupListener();
            }
        } catch (err) {
            logger.error(err);
            this.stop();
        }
    }

    async stop() {
        mongoose.connection.close();
        if (this.eventBus) {
            await this.eventBus.disconnect();
        }
    }
};
