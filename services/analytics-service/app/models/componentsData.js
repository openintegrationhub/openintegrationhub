const mongoose = require('mongoose');

const componentsData = require('./schemas/componentsData').componentsData;

// Compile model from schema
module.exports = mongoose.model('ComponentsData', componentsData);
