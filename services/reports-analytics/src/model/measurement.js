const mongoose = require('mongoose');

const { Schema } = mongoose;

const measurement = new Schema({
    measurementName: {
        type: String,
        required: true,
    },
    measurementSchema: {
        type: Schema.Types.Mixed,
        required: true,
    },
    eventName: {
        type: String,
        required: true,
    },
    payloadMapping: {
        type: Schema.Types.Mixed,
        required: true,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('measurement', measurement);
