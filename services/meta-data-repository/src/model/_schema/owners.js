const { Schema } = require('mongoose');

const owners = new Schema({
    id: String,
    type: String,
    isImmutable: Boolean,
}, { _id: false });

module.exports = owners;
