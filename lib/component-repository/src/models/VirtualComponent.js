const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ownersSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  _id: false,
});

const versionsSchema = new Schema({
  id: {
    type: Schema.Types.ObjectId,
    ref: 'ComponentVersion',
  },
  componentVersion: String,
  apiVersion: String,
  _id: false,
});

// Define schema
const virtualComponent = new Schema(
  {
    name: { type: String, required: true },
    defaultVersionId: { type: Schema.Types.ObjectId, ref: 'ComponentVersion' },
    versions: {
      type: [versionsSchema],
    },
    tenant: { type: String },
    access: {
      type: String,
      enum: ['private', 'public'],
      default: 'private',
    },
    owners: {
      type: [ownersSchema],
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VirtualComponent', virtualComponent);
