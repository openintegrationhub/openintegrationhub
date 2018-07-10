const mongoose = require('mongoose');
const accountSchema = require('./schemas/account').account;

module.exports = mongoose.model('account', accountSchema);
