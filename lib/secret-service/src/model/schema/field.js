const { Schema } = require('mongoose');

const field = new Schema({
    key: {
        type: String,
        required: true,
    },
    label: String,
    required: Boolean,

}, { _id: false });

module.exports = field;
