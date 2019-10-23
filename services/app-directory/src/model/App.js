const mongoose = require('mongoose');

const { Schema } = mongoose;

const component = new Schema({
    type: { type: String, index: true, required: true },
    componentId: { type: String },
}, { _id: false });

const Operation = new Schema({
    // type: {
    //     type: String,
    //     enum: [
    //         'action',
    //         'trigger',
    //     ],
    //     required: true,
    // },
    adapterOperation: { type: String },
    transformerOperation: { type: String },
    sdfAdapterOperation: { type: String },
    direction: {
        type: String,
        enum: [
            'inbound',
            'outbound',
        ],
    },
}, { _id: false });

// const SyncMapping = new Schema({
//     dataModel: { type: String, index: true, required: true },
//     operations: [Operation],
// }, { _id: false });

const app = new Schema({
    artifactId: {
        type: String, lowercase: true, index: { unique: true }, required: true,
    },
    name: { type: String, index: { unique: true }, required: true },
    description: String,
    img: String,
    credentials: {
        credentialsType: String,
        fields: Schema.Types.Mixed,
        authClient: String,
        scopes: String,
    },
    dataModels: [String],
    components: {
        adapter: String,
        transformer: String,
        sdfAdapter: String,
    },
    isGlobal: Boolean,
    tenant: String,
    urls: {
        main: String,
    },
    status: String,
    // supportedConnections: {
    //     inbound: Boolean,
    //     outbound: Boolean,
    // },
    syncMappings: [Operation],
}, {
    timestamps: true,
});

module.exports = mongoose.model('app', app);
