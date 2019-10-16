const mongoose = require('mongoose');

const { Schema } = mongoose;

const component = new Schema({
    type: { type: String, index: true, required: true },
    name: { type: String, index: true, required: true },
    uri: { type: String },
    componentId: { type: String },
}, { _id: false });

const Operation = new Schema({
    type: {
        type: String,
        enum: [
            'action',
            'trigger',
        ],
        required: true,
    },
    operationName: { type: String, required: true },
    direction: {
        type: String,
        enum: [
            'inbound',
            'outbound',
        ],
        required: true,
    },
    componentId: { type: String },
}, { _id: false });

const SyncMapping = new Schema({
    dataModel: { type: String, index: true, required: true },
    operations: [Operation],
}, { _id: false });

const app = new Schema({
    artifactId: {
        type: String, lowercase: true, index: { unique: true }, required: true,
    },
    name: { type: String, index: { unique: true }, required: true },
    description: { type: String },
    img: { type: String },
    credentials: {
        customStructure: Schema.Types.Mixed,
        authClient: { type: String },
    },
    dataModels: [String],
    components: [component],
    isGlobal: Boolean,
    tenant: String,
    urls: {
        main: String,
    },
    status: { type: String },
    // supportedConnections: {
    //     inbound: Boolean,
    //     outbound: Boolean,
    // },
    syncMappings: [SyncMapping],
}, {
    timestamps: true,
});

module.exports = mongoose.model('app', app);
