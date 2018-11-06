const { Schema } = require('mongoose');

const owner = new Schema({
    entityId: String,
    entityType: String,
}, { _id: false });

module.exports = owner;
