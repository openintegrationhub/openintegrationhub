const mongoose = require('mongoose');
const conf = require('../../conf');

const { Schema } = mongoose;

const authFlow = new Schema({
    creator: {
        type: String,
        required: true,
    },
    creatorType: {
        type: String,
        required: true,
    },
    scope: {
        type: String,
        required: true,
    },
    backReference: String,
    authClientId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: conf.ttl.authFlow,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('auth-flow', authFlow);
