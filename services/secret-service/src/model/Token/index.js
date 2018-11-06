const mongoose = require('mongoose');

const { Schema } = mongoose;

const token = new Schema({
    value: {
        type: String,
        required: true,
    },
    secretId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    expires: {
        type: Date,
        required: true,
    },
    willBeRenewed: {
        type: Boolean,
    },
    renewalStartedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('token', token);
