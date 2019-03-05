const mongoose = require('mongoose');
const owners = require('../_schema/owners');

const { Schema } = mongoose;

const schema = new Schema({
    name: {
        type: String,
        required: true,
    },
    description: String,
    uri: {
        type: String,
        required: true,
    },
    value: Object,
    owners: {
        type: [owners],
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('schema', schema);
