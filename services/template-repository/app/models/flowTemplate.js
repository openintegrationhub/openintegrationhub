const mongoose = require('mongoose');

const flowTemplate = require('./schemas/flowTemplate').flowTemplate;

// Compile model from schema
module.exports = mongoose.model('FlowTemplate', flowTemplate);
