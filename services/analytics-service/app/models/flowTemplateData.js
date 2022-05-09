const mongoose = require('mongoose');

const flowTemplateData = require('./schemas/flowTemplateData').flowTemplateData;

// Compile model from schema
module.exports = mongoose.model('FlowTemplateData', flowTemplateData);
