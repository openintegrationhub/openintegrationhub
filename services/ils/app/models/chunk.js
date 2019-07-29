const mongoose = require('mongoose');
const { chunk } = require('./schemas/chunk.js');

// Compile model from schema
module.exports = mongoose.model('Chunk', chunk);
