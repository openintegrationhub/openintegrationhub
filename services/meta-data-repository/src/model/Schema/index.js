const mongoose = require('mongoose');
const owners = require('../_schema/owners');

const { Schema } = mongoose;
const { ObjectId } = Schema;
const schema = new Schema({
    name: {
        type: String,
        required: true,
    },
    domainId: {
        type: ObjectId,
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
    refs: {
        type: [String],
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('schema', schema);
