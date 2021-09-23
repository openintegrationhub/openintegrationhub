const mongoose = require('mongoose');

const { Schema } = mongoose;
const CONSTANTS = require('../../constants');

const TenantSchema = new Schema({
    name: { type: String, index: true },
    confirmed: { 
        type: Boolean, 
        default: true, 
    },
    status: {
        type: String,
        enum: [
            CONSTANTS.STATUS.ACTIVE,
            CONSTANTS.STATUS.DISABLED,
            CONSTANTS.STATUS.PENDING,
        ],
        default: CONSTANTS.STATUS.ACTIVE,
    },

}, {
    timestamps: true,
});

module.exports = TenantSchema;
