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

// Define schema
const virtualComponent = new Schema(
  {
    name: { type: String, required: true },
    defaultVersion: { type: Schema.Types.ObjectId, ref: 'ComponentVersion' },
    versions: [
      {
        id: {
          type: Schema.Types.ObjectId,
          ref: 'ComponentVersion',
        },
        version: String,
      },
    ],
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('VirtualComponent', virtualComponent);
