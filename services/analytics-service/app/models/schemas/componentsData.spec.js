// Statistics about objects passing through the flow
const componentUsage = {
  objectId: String,
  type: {
    type: String,
    enum: ['received', 'send'],
    default: 'user',
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
    default: 'inactive',
  },
  statusChangedAt: String,
  usage: [componentUsage],
  owners: [String], // tenantId
  errors: [componentErrors],
};

module.exports.componentsData = componentsData;
