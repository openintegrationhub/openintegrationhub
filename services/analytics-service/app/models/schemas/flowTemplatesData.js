const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Flows that are based on the template
const flows = {
  flowId: String,
};

// Define schema
const flowTemplatesData = new Schema({
    flowTemplateId: String,
    flowTemplateName: String,
    createdAt: String,
    steps: String,
    usage: [flows],
    owners: [String], // tenantId
}, { collection: 'flowTemplates', timestamps: true });

module.exports.flowTemplateData = flowTemplatesData;
