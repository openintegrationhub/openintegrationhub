const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Statistics about objects passing through the flow
const componentUsage = {
  objectId: String,
  type: {
      type: String,
      enum : ['received','send'],
      default: 'user'
  },,
  oihDataSchema: String,
};

const componentErrors = {
  errorCode: String,
  errorText: String,
  timestamp: String,
};

// Define schema
const componentsData = new Schema({
    flowId: String,
    flowName: String,
    status: {
        type: String,
        enum : ['active', 'inactive', 'starting', 'stopping'],
        default: 'inactive'
    },
    statusChangedAt: String,
    errors: [String],
    usage: [flowUsage],
    owners: [String], // tenantId
    errors: [componentErrors],
}, { collection: 'componentsData', timestamps: true });

module.exports.componentsData = componentsData;
