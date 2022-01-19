const mongoose = require('mongoose');

const storedFunction = require('./schemas/storedFunction').storedFunction;

// Compile model from schema
module.exports = mongoose.model('StoredFunction', storedFunction);
