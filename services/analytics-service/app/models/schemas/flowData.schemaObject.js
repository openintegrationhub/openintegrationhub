// Statistics about objects passing through the flow
const flowUsage = {
  objectId: String,
  started: String,
  ended: String,
  oihDataSchema: String,
};

const flowErrors = {
  componentId: String,
  errorCode: String,
  errorText: String,
  timestamp: String,
};

// Define schema
const flowData = {
  flowId: String,
  flowName: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'starting', 'stopping'],
    // default: 'inactive',
  },
  statusChangedAt: String,
  usage: [flowUsage],
  owners: [{
    type: String,
  }], // tenantId
  errorData: [flowErrors],
  errorCount: {
    type: Number,
    default: 0,
  },
};

module.exports.flowData = flowData;
