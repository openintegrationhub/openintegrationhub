const mongoose = require('mongoose');

const provenanceEvent = require('./schemas/provenanceEvent').provenanceEvent;

// Compile model from schema
module.exports = mongoose.model('ProvenanceEvent', provenanceEvent);
