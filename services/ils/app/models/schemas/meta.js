const mongoose = require('mongoose');

const { Schema } = mongoose;

const meta = new Schema({
  splitKey: String,
  userId: String,
  tenant: String,
}, { _id: false });

module.exports = meta;
