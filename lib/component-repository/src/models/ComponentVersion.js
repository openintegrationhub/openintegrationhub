const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const { AUTH_TYPE } = require('../constants');

const func = new Schema ({
  name: {
    type: String,
    required: true,
  },
  title: {
    type: String,
  },
  description: {
    type: String,
    maxLength: 300,
  },
  function: {
    type: String,
    required: true,
  },
  fields: {
    type: Schema.Types.Mixed
  },
  schemas: {
    in: { type: Schema.Types.Mixed},
    out: { type: Schema.Types.Mixed},
  },
  active: {
    type: Boolean,
    default: true
  }
  // FUTURE: Add an "Address" or "Implementation" field containing the repo id or the function location
}, { _id : false });

// Define schema
const componentVersion = new Schema({
  name: {
    type: String,
    maxLength: 50,
    required: true,
  },
  description: {
    type: String,
    maxLength: 300,
  },
  componentId: { type: Schema.Types.ObjectId, ref: 'Component', required: true },
  authorization: {
    authType: {
      type: String,
      enum: Object.keys(AUTH_TYPE),
      required: true,
    },
    authSetupLink: {
      type: String,
    },
  },
  actions: { type: [func]},
  triggers: { type: [func]},
  virtualComponentId: { type: Schema.Types.ObjectId, ref: 'VirtualComponent', required: true },
}, { timestamps: true });

module.exports = mongoose.model('ComponentVersion', componentVersion);
