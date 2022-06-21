// Flows that are based on the template
const flows = {
  flowId: { type: String },
};

// Define schema
const flowTemplatesData = {
  flowTemplateId: { type: String },
  flowTemplateName: { type: String },
  createdAt: { type: String },
  steps: { type: String },
  usage: [flows],
  owners: [{
    type: String,
  }], // tenantId
  bucketStartAt: { type: 'Date', default: 0 },
};

module.exports.flowTemplateData = flowTemplatesData;
