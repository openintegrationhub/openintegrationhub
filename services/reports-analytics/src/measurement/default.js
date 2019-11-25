const Influx = require('influx');

module.exports = {
    measurement: 'default',
    fields: {
        keyDefault: Influx.FieldType.STRING,
    },
    tags: [
        'event_name',
        'service_name',
    ],
};
