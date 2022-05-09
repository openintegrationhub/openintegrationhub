const mongoose = require('mongoose');

const flowData = require('./schemas/flowData').flowData;

// Compile model from schema
module.exports = mongoose.model('FlowData', flowData);
