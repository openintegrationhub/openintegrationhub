const Influx = require('influx');

Object.fromEntries = (arr) => Object.assign({}, ...Array.from(arr, ([k, v]) => ({ [k]: v })));

module.exports = {
    transformEntries(fields, map) {
        return Object
            .fromEntries(
                Object
                    .keys(fields)
                    .map((key) => [[key], map[fields[key]] || null]),
                // filter non empty elements
                // .filter((f) => f[1]),
            );
    },
    transformMeasurement(measurement) {
        const { measurementSchema, measurementName } = measurement;
        return {
            measurement: measurementName,
            ...(measurementSchema.fields ? {
                fields: module.exports.transformEntries(measurementSchema.fields, Influx.FieldType),
            } : {}),
            ...(measurementSchema.tags ? {
                tags: [
                    ...measurementSchema.tags,
                ],
            } : {}),
        };
    },
};
