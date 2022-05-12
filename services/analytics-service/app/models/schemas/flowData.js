const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Statistics about objects passing through the flow
const flowUsage = {
  objectId: String,
  started: String,
  ended: String,
  oihDataSchema: String,
};

const flowErrors = {
  errorCode: String,
  errorText: String,
  timestamp: String,
};

// Define schema
const flowData = new Schema({
  flowId: String,
  flowName: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'starting', 'stopping'],
    default: 'inactive',
  },
  statusChangedAt: String,
  errors: [String],
  usage: [flowUsage],
  owners: [String], // tenantId
  errors: [flowErrors],
}, { collection: 'flowData', timestamps: true });

module.exports.flowData = flowData;
