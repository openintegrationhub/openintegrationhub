// Statistics about objects passing through the flow
const flowUsage = {
  objectId: { type: String },
  started: { type: String },
  ended: { type: String },
  oihDataSchema: { type: String },
};

const flowErrors = {
  componentId: { type: String },
  errorCode: { type: String },
  errorText: { type: String },
  timestamp: { type: String },
};

// Define schema
const flowData = {
  flowId: { type: String },
  flowName: { type: String },
  status: {
    type: String,
    enum: ['active', 'inactive', 'starting', 'stopping'],
    // default: 'inactive',
  },
  statusChangedAt: { type: String },
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
