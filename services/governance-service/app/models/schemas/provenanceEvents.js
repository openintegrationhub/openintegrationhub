const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Define schema
const provenanceEvent = new Schema({
}, { collection: 'provenanceEvents', timestamps: true });

module.exports.provenanceEvent = provenanceEvent;
