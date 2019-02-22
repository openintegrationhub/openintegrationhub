const mongoose = require('mongoose');
const owners = require('./schema/owners');

const { Schema } = mongoose;

const domain = new Schema({
    name: {
        type: String,
        required: true,
    },
    description: String,
    public: Boolean,
    owners: {
        type: [owners],
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('domain', domain);
