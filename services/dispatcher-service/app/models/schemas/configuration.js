

const mongoose = require('mongoose');

const { Schema } = mongoose;


// Define schema
const configuration = new Schema({
  tenant: String,
  applications: [
    {
      applicationName: String,
      applicationUid: String,
      adapterComponentId: String,
      transformerComponentId: String,
      secretId: String,

      outbound: {
        _id: false,
        active: Boolean,
        flows: [
          {
            _id: false,
            transformerAction: String,
            adapterAction: String,
            schemaUri: String,
            flowId: String,
          },
        ],
      },

      inbound: {
        _id: false,
        active: Boolean,
        flows: [
          {
            _id: false,
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
