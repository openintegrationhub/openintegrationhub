const { Schema } = require('mongoose');
const field = require('./field');

const requestConfig = new Schema({
    requestFields: {
        type: [field],
        required: true,
    },
    label: String,
    required: Boolean,

}, { _id: false });

module.exports = requestConfig;

// TODO: Add support for config types: Header, Body, Params
