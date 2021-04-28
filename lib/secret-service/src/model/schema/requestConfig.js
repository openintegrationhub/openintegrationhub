const { Schema } = require('mongoose');

const requestTypes = require('../../constant').AUTH_REQUEST_TYPE;

const requestField = new Schema({
    key: {
        type: String,
        required: true,
    },
    value: String,
}, { _id: false });

const requestConfig = new Schema({
    requestFields: [requestField],
    label: String,
    authType: {
        type: String,
        required: true,
        enum: Object.values(requestTypes),
    },
    url: {
        type: String,
        required: true,
    },
}, { _id: false });

module.exports = requestConfig;
