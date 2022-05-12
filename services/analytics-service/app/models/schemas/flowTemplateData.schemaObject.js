// Flows that are based on the template
const flows = {
  flowId: String,
};

// Define schema
const flowTemplatesData = {
  flowTemplateId: String,
  flowTemplateName: String,
  createdAt: String,
  steps: String,
  usage: [flows],
  owners: [{
    type: String,
  }], // tenantId
};

module.exports.flowTemplateData = flowTemplatesData;
