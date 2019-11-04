

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

      inbound: {
        active: Boolean,
        flows: [
          {
            transformerAction: String,
            adapterAction: String,
            flowId: String,
          },
        ],
      },

      outbound: {
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
            flowId: String,
          },
        ],
      },
    },
  ],
},
{ collection: 'configurations', timestamps: true });


module.exports.configuration = configuration;
