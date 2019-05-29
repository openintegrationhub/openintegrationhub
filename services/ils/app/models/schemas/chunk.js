const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const chunkSchema = new Schema({
  ilaId: String,
  cid: String,
  def: Object,
  payload: Object,
  valid: Boolean,
  expireAt: {
    type: Date,
    default: undefined,
  },
},
{ collection: 'chunk' });
chunkSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports.chunk = chunkSchema;
