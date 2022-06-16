// Statistics about objects passing through the flow
const componentUsage = {
  objectId: { type: String },
  // objectType: {
  //   type: String,
  //   enum: ['received', 'send'],
  //   // default: 'send',
  // },
  oihDataSchema: String,
};

const componentErrors = {
  errorCode: { type: String },
  errorText: { type: String },
  timestamp: { type: String },
};

// Define schema
const componentsData = {
  componentId: { type: String },
  componentName: { type: String },
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
  bucketStartAt: { type: Number, default: 0 },
};

module.exports.componentsData = componentsData;
