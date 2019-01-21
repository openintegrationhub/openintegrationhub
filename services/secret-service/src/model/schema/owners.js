const { Schema } = require('mongoose');

const owners = new Schema({
    entityId: String,
    entityType: String,
}, { _id: false });

module.exports = owners;
