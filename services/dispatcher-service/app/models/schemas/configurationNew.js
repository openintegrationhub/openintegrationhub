

const mongoose = require('mongoose');

const { Schema } = mongoose;


// Define schema
const configuration = new Schema({
  tenant: String,
  applications: [
    {
      appName: String,
      appUid: String,
      adapterComponentId: String,
      transformerComponentId: String,
      secretId: String,

      outbound: {
        active: Boolean,
        flows: [
          {
            transformerAction: String,
            adapterAction: String,
            schemaUri: String,
            flowId: String,
          },
        ],
      },

      inbound: {
        active: Boolean,
        flows: [
          {
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
    },
  ],
},
{ collection: 'configurations', timestamps: true });


module.exports.configuration = configuration;
