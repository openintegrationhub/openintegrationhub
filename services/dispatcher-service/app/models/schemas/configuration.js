

const mongoose = require('mongoose');

const { Schema } = mongoose;


// Define schema
const configuration = new Schema({
  tenant: String,
  connections: [
    {
      _id: false,
      source: {
        _id: false,
        appId: String,
        domain: String,
        flowId: String,
      },
      targets: [
        {
          _id: false,
          active: Boolean,
          flowId: String,
          routingKey: String,
          appId: String,
        },
      ],
    },
  ],
},
{ collection: 'configurations', timestamps: true });

configuration.index({ 'connections.source.flowId': 1 });
configuration.index({ tenant: 1 }, { unique: true });


module.exports.configuration = configuration;
