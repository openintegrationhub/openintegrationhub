

const mongoose = require('mongoose');

const { Schema } = mongoose;


// Define schema
const configuration = new Schema({
  tenant: String,
  connections: [
    {
      active: Boolean,
      source: {
        appId: String,
        domain: String,
      },
      targets: [
        {
          flowId: String,
          routingKey: String,
        },
      ],
    },
  ],
},
{ collection: 'configurations' });

module.exports.configuration = configuration;
