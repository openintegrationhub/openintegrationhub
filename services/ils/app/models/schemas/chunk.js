const mongoose = require('mongoose');

const { Schema } = mongoose;
const meta = require('./meta');

const chunkSchema = new Schema({
  meta,
  ilaId: String,
  cid: String,
  def: Object,
  payload: Object,
  splitKey: String,
  userId: String,
  valid: Boolean,
  expireAt: {
    type: Date,
    default: undefined,
  },
},
{ collection: 'chunk' });
chunkSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports.chunk = chunkSchema;
