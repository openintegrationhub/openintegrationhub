const conf = require('../conf');

const Server = require('../server');
const Measurement = require('../dao/measurement');
const { getValidMeasurements } = require('.');

let server;

describe('validation', () => {
    beforeAll(async () => {
        conf.mongoDbConnection = global.__MONGO_URI__.replace('changeme', 'dao');
        conf.port = 3000;

        server = new Server();
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('measurement', async () => {
        // valid
        await Measurement.create({
            measurementName: 'test',
            measurementSchema: {
                tags: ['tag1', 'tag2'],
                fields: {
                    field1: 'INTEGER',
                    field2: 'STRING',
                    field3: 'BOOLEAN',
                },
            },
            eventName: 'test',
            payloadMapping: {
                tags: {
                    tag1: 'payload1',
                    tag2: 'payload2',
                },
                fields: {
                    field1: 'payload3',
                    field2: 'payload4',
                    field3: 'payload5',
                },
            },
        });

        // invalid - wildcard
        await Measurement.create({
            measurementName: 'test',
            measurementSchema: {
                tags: ['tag1', 'tag2'],
                fields: {
                    field1: 'INTEGER',
                    field2: 'STRING',
                    field3: 'BOOLEAN',
                },
            },
            eventName: 'test.*',
            payloadMapping: {
                tags: {
                    tag1: 'payload1',
                    tag2: 'payload2',
                },
                fields: {
                    field1: 'payload3',
                    field2: 'payload4',
                    field3: 'payload5',
                },
            },
        });

        // invalid - tags missing
        await Measurement.create({
            measurementName: 'test',
            measurementSchema: {
                tags: [],
                fields: {
                    field1: 'INTEGER_INVALID',
                    field2: 'STRING',
                    field3: 'BOOLEAN',
                },
            },
            eventName: 'test',
            payloadMapping: {
                tags: {
                    tag1: 'payload1',
                    tag2: 'payload2',
                },
                fields: {
                    field1: 'payload3',
                    field2: 'payload4',
                    field3: 'payload5',
                },
            },
        });

        // invalid - tags missing
        await Measurement.create({
            measurementName: 'test',
            measurementSchema: {
                fields: {
                    field1: 'INTEGER_INVALID',
                    field2: 'STRING',
                    field3: 'BOOLEAN',
                },
            },
            eventName: 'test',
            payloadMapping: {
                tags: {
                    tag1: 'payload1',
                    tag2: 'payload2',
                },
                fields: {
                    field1: 'payload3',
                    field2: 'payload4',
                    field3: 'payload5',
                },
            },
        });

        // invalid - tags not included
        await Measurement.create({
            measurementName: 'test',
            measurementSchema: {
                tags: ['foo'],
                fields: {
                    field1: 'INTEGER',
                    field2: 'STRING',
                    field3: 'BOOLEAN',
                },
            },
            eventName: 'test',
            payloadMapping: {
                tags: {
                    foo1: 'payload1',
                },
                fields: {
                    field1: 'payload3',
                    field2: 'payload4',
                    field3: 'payload5',
                },
            },
        });

        // invalid - fields missing
        await Measurement.create({
            measurementName: 'test',
            measurementSchema: {
                tags: ['foo'],
                fields: {
                },
            },
            eventName: 'test',
            payloadMapping: {
                tags: {
                    foo: 'payload1',
                },
                fields: {
                    field1: 'payload3',
                    field2: 'payload4',
                    field3: 'payload5',
                },
            },
        });

        // invalid - fields missing
        await Measurement.create({
            measurementName: 'test',
            measurementSchema: {
                tags: ['foo'],
            },
            eventName: 'test',
            payloadMapping: {
                tags: {
                    foo: 'payload1',
                },
                fields: {
                    field1: 'payload3',
                    field2: 'payload4',
                    field3: 'payload5',
                },
            },
        });

        // invalid - field type not existing
        await Measurement.create({
            measurementName: 'test',
            measurementSchema: {
                tags: ['tag1', 'tag2'],
                fields: {
                    field1: 'INTEGER_INVALID',
                    field2: 'STRING',
                    field3: 'BOOLEAN',
                },
            },
            eventName: 'test',
            payloadMapping: {
                tags: {
                    tag1: 'payload1',
                    tag2: 'payload2',
                },
                fields: {
                    field1: 'payload3',
                    field2: 'payload4',
                    field3: 'payload5',
                },
            },
        });

        // invalid - field type not existing
        await Measurement.create({
            measurementName: 'test',
            measurementSchema: {
                tags: ['tag1', 'tag2'],
                fields: {
                    field1: 'INTEGER',
                    field2: 'STRING',
                    field3: 'BOOLEAN',
                },
            },
            eventName: 'test',
            payloadMapping: {
                tags: {
                    tag1: 'payload1',
                    tag2: 'payload2',
                },
                fields: {
                    field4: 'payload3',
                },
            },
        });

        const measurements = await Measurement.get();
        expect(getValidMeasurements(measurements).length).toEqual(1);
    });
});
