const mongoose = require('mongoose');

const { log } = require('./schemas/log');
// Compile model from schema
module.exports = mongoose.model('Log', log);
