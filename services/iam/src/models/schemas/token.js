const mongoose = require('mongoose');

const CONSTANTS = require('../../constants');

const { Schema } = mongoose;

const TokenSchema = new Schema({
    inquirer: { type: Schema.ObjectId, ref: 'account', index: true }, // user or a service running on behalf of the user
    initiator: { type: Schema.ObjectId, ref: 'account', index: true }, // user or a service who initiated this token request
    accountId: { type: Schema.ObjectId, ref: 'account', index: true },
    token: {
        type: String,
        index: true,
        unique: true,
    },
    type: {
        type: String,
        'enum': Object.keys(CONSTANTS.TOKEN_TYPES),
        'default': CONSTANTS.TOKEN_TYPES.SELF,
    },
    description: String,
    permissions: [String],
    tokenLifeSpan: String,
    expireAt: { type: Date, default: undefined },

}, {
    timestamps: true,
});

TokenSchema.index({ 'expireAt': 1 }, { expireAfterSeconds: 0 });

module.exports = TokenSchema;
