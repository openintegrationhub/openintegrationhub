const mongoose = require('mongoose');

const { Schema } = mongoose;

// const component = new Schema({
//     type: { type: String, index: true, required: true },
//     componentId: { type: String },
// }, { _id: false });

const Operation = new Schema({
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
    actionTypes: [{
        type: String,
        _id: false,
        enum: [
            'CREATE',
            'UPDATE',
            'DELETE',
        ],
    }],
    dataModels: [String],
}, {
    _id: false,
});

const app = new Schema({
    artifactId: {
        type: String,
        lowercase: true,
        unique: true,
        required: true,
    },
    name: {
        type: String,
        unique: true,
        required: true,
    },
    description: String,
    img: String,
    credentials: {
        credentialsType: String,
        fields: Schema.Types.Mixed,
        authClient: String,
        scopes: String,
    },
    // dataModels: [String],
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
