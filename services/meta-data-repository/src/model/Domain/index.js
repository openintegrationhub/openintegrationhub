const mongoose = require('mongoose');
const owners = require('../_schema/owners');

const { Schema } = mongoose;

const domain = new Schema({
    name: {
        type: String,
    },
    description: String,
    public: Boolean,
    owners: {
        type: [owners],
    },
    tenant: String,
}, {
    autoCreate: true,
    timestamps: true,
});

module.exports = mongoose.model('domain', domain);
