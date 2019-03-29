const { Schema } = require('mongoose');

const owner = new Schema({
    id: String,
    type: String,
}, { _id: false });

module.exports = owner;
