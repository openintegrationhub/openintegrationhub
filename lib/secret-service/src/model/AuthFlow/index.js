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
    authClientId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    scope: {
        type: String,
    },
    secretName: {
        type: String,
    },
    requestToken: String,
    requestTokenSecret: String,
    keyParameter: String,
    successUrl: String,
    createdAt: {
        type: Date,
        default: Date.now,
        expires: conf.ttl.authFlow,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('auth-flow', authFlow);
