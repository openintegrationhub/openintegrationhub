const mongoose = require('mongoose');

const { Schema } = mongoose;

const token = new Schema({
    value: {
        type: String,
        required: true,
    },
    secretId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    expires: {
        type: Date,
        required: true,
    },
    lockedAt: Date,
}, {
    timestamps: true,
});

module.exports = mongoose.model('token', token);
