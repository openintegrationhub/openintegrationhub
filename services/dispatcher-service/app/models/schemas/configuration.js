const mongoose = require('mongoose');

const { Schema } = mongoose;

const appSchema = new Schema({
  applicationName: String,
  applicationUid: String,
  adapterComponentId: String,
  transformerComponentId: String,
  secretId: String,

  outbound: {
    // _id: false,
    active: Boolean,
    flows: [
      {
        // _id: false,
        transformerAction: String,
        adapterAction: String,
        schemaUri: String,
        flowId: String,
      },
    ],
  },

  inbound: {
    // _id: false,
    active: Boolean,
    flows: [
      {
        // _id: false,
        operation: {
          type: String,
          enum: [
            'CREATE',
            'UPDATE',
            'DELETE',
          ],
        },
        transformerAction: String,
        adapterAction: String,
        schemaUri: String,
        flowId: String,
      },
    ],
  },
});

// Define schema
const configuration = new Schema({
  tenant: String,
  name: String,
  dataModel: String,
  applications: [appSchema],
}, { collection: 'configurations', timestamps: true });

module.exports.configuration = configuration;
