const { Schema } = require('mongoose');

const owners = new Schema({
    id: String,
    type: String,
}, { _id: false });

module.exports = owners;
