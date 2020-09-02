const mongoose = require('mongoose');

const flow = require('./schemas/flow').flow;

// Compile model from schema
module.exports = mongoose.model('Flow', flow);
