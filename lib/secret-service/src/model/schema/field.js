const { Schema } = require('mongoose');

const field = new Schema({
    key: String,
    label: String,
    required: Boolean,

}, { _id: false });

module.exports = field;
