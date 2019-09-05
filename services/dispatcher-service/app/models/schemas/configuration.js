

const mongoose = require('mongoose');

const { Schema } = mongoose;


// Define schema
const configuration = new Schema({
  tenant: String,
  connections: [
    {
      source: {
        appId: String,
        domain: String,
      },
      targets: [
        {
          active: Boolean,
          flowId: String,
          routingKey: String,
          appId: String,
        },
      ],
    },
  ],
},
{ collection: 'configurations' });

module.exports.configuration = configuration;
