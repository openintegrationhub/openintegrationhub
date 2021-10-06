const mongoose = require('mongoose');

const { Schema } = mongoose;

// Define schema
const log = new Schema({
    headers: {
        createdAt: { type: Date, default: Date.now },
        serviceName: String,
        name: String,
    },
    payload: Object,
},
{ collection: 'logs' });

module.exports.log = log;
