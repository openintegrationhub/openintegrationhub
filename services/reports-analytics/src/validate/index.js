const logging = require('@basaas/node-logger');
const Influx = require('influx');

const conf = require('../conf');

const logger = logging.getLogger(`${conf.log.namespace}/validate`);

const ERROR_PREFIX = 'Invalid Measurement:';
const ERROR_SUFFIX = (id) => `Skipping ${id}`;

const getErrorMessage = (message, id) => `${ERROR_PREFIX} ${message} ${ERROR_SUFFIX(id)}`;

module.exports = {
    verifyMeasurement(measurement) {
        const { measurementSchema, payloadMapping, eventName } = measurement;
        if (eventName.includes('*')) {
            throw new Error(getErrorMessage('No wildcards allowed for eventName.', measurement._id));
        }

        if (!measurementSchema.tags) {
            throw new Error(getErrorMessage('Tags missing in schema.', measurement._id));
        }

        if (payloadMapping.tags) {
            for (const tag of Object.keys(payloadMapping.tags)) {
                if (!measurementSchema.tags.includes(tag)) {
                    throw new Error(getErrorMessage(`Tag "${tag}" not in included in schema.`, measurement._id));
                }
            }
        }

        if (!measurementSchema.fields || Object.keys(measurementSchema.fields).length === 0) {
            throw new Error(getErrorMessage('Fields missing in schema.', measurement._id));
        }

        if (payloadMapping.fields) {
            for (const field of Object.keys(payloadMapping.fields)) {
                if (!Object.keys(measurementSchema.fields).includes(field)) {
                    throw new Error(getErrorMessage(`Field "${field}" not included in schema.`, measurement._id));
                }
            }
        }

        for (const type of Object.values(measurementSchema.fields)) {
            if (!Influx.FieldType[type]) {
                throw new Error(getErrorMessage(`"${type}" is invalid field type.`, measurement._id));
            }
        }
        return measurement;
    },
    getValidMeasurements(measurements) {
        const valid = [];
        for (const measurement of measurements) {
            try {
                valid.push(module.exports.verifyMeasurement(measurement));
            } catch (err) {
                logger.error(err);
            }
        }

        return valid;
    },
};
