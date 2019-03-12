

const mongoose = require('mongoose');

const { Schema } = mongoose;


// Define schema
const log = new Schema({
  service: String,
  timeStamp: String,
  nameSpace: String,
  payload: {
    tenant: String,
    source: String,
    object: String,
    action: String,
    subject: String,
    details: String,
  },
},
{ collection: 'logs' });

module.exports.log = log;
