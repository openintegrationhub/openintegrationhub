const mongoose = require('mongoose');

const WorkflowSchema = require('./schemas/WorkflowSchema');

module.exports = mongoose.model('workflow', WorkflowSchema);
