const mongoose = require('mongoose');

const provenanceEvent = require('./schemas/provenanceEvents').provenanceEvent;

// Compile model from schema
module.exports = mongoose.model('ProvenanceEvent', provenanceEvent);
