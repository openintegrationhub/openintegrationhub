

const mongoose = require('mongoose');

const { configuration } = require('./schemas/configuration');

// Compile model from schema
module.exports = mongoose.model('Configuration', configuration);
