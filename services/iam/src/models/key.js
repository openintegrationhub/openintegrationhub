const mongoose = require('mongoose');
const keySchema = require('./schemas/key');

module.exports = mongoose.model('key', keySchema);
