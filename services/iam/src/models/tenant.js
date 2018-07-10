const mongoose = require('mongoose');
const tenantSchema = require('./schemas/tenant');

module.exports = mongoose.model('tenant', tenantSchema);
