// Statistics about objects passing through the flow
const componentUsage = {
  objectId: String,
  type: {
    type: String,
    enum: ['received', 'send'],
    // default: 'send',
  },
  oihDataSchema: String,
};

const componentErrors = {
  errorCode: String,
  errorText: String,
  timestamp: String,
};

// Define schema
const componentsData = {
  flowId: String,
  flowName: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'starting', 'stopping'],
    // default: 'inactive',
  },
  statusChangedAt: String,
  usage: [componentUsage],
  owners: [{
    type: String,
  }], // tenantId
  errorData: [componentErrors],
};

module.exports.componentsData = componentsData;
