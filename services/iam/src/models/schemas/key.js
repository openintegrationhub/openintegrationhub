const mongoose = require('mongoose');

const { Schema } = mongoose;

const KeySchema = new Schema({
    tenant: {
        type: Schema.ObjectId, 
        ref: 'tenant', 
        index: true, 
        unique: true, 
    },
    value: String,

}, {
    timestamps: true,
});

module.exports = KeySchema;
