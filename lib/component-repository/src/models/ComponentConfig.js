const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Define schema
const componentConfig = new Schema(
  {
    componentVersionId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Configuration requires a Component Version Id'],
    },
    authClientId: { type: Schema.Types.ObjectId },
    tenant: {
      type: String,
      required: [true, 'Configuration requires a Tenant'],
    },
  },
  { timestamps: true },
);

componentConfig.index({ componentVersionId: 1, tenant: 1 }, { unique: true });

module.exports = mongoose.model('ComponentConfig', componentConfig);
