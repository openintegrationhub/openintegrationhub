const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const metaData = {
  oihUser: String,
  tenant: String,
};

// Define schema
const storedFunction = new Schema({
  metaData,
  name: { type: String, required: [true, 'Name of function required'] },
  code: String,
}, { collection: 'storedFunctions', timestamps: true });

module.exports.storedFunction = storedFunction;
