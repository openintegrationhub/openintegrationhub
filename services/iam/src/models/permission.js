const mongoose = require('mongoose');
const permissionSchema = require('./schemas/permission');

module.exports = mongoose.model('permission', permissionSchema);
