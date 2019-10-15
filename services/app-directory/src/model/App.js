const mongoose = require('mongoose');

const { Schema } = mongoose;

const component = new Schema({
    type: { type: String, index: true, required: true },
    name: { type: String, index: true, required: true },
    uri: { type: String },
}, { _id: false });

const app = new Schema({
    artifactId: {
        type: String, lowercase: true, index: { unique: true }, required: true,
    },
    name: { type: String, index: { unique: true }, required: true },
    description: { type: String },
    img: { type: String },
    authClient: { type: String },
    dataModels: [String],
    components: [component],
    isGlobal: Boolean,
    tenant: String,
    urls: {
        main: String,
    },
    status: { type: String },
    supportedConnections: {
        inbound: Boolean,
        outbound: Boolean,
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('app', app);
