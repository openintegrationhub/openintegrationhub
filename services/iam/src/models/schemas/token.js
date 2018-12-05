const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const CONSTANTS = require('./../../constants');

const TokenSchema = new Schema({
    inquirer: { type: Schema.ObjectId, ref: 'account' }, // user or a a service running on behalf of the user
    initiator: { type: Schema.ObjectId, ref: 'account' }, // a privileged service, which can create such token
    tokenId: String, // jti
    type: String,
    description: String,
    permissions: [String],
    expireAt: { type: Date, default: undefined },

}, {
    timestamps: true,
});

TokenSchema.index({ 'expireAt': 1 }, { expireAfterSeconds: 0 });

module.exports = TokenSchema;
