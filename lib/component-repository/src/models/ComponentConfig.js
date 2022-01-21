const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Define schema
const componentConfig = new Schema(
  {
    componentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Configuration requires a Component'],
    },
    authClientId: { type: Schema.Types.ObjectId },
    tenant: {
      type: String,
      required: [true, 'Configuration requires a Tenant'],
    },
  },
  { timestamps: true },
);

componentConfig.index({ componentId: 1, tenant: 1 }, { unique: true });

module.exports = mongoose.model('ComponentConfig', componentConfig);
