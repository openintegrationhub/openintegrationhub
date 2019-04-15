const mongoose = require('mongoose');
const { Schema } = mongoose;

const ownersSchema = new Schema({
    id: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    _id: false
});

const schema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    descriptor: {
        type: Schema.Types.Mixed
    },
    distribution: {
        type: {
            type: String,
            enum: ['docker'],
            default: 'docker',
            required: true
        },
        image: {
            type: String
        },
        registrySecretId: {
            type: String
        }
    },
    owners: {
        type: [ownersSchema],
        required: true
    }
}, {
    timestamps: true
});



schema.set('toJSON', {
    transform(doc, ret, options) {
        ret.id = doc.id;
        delete ret._id;
        delete ret.__v;

        return ret;
    }
});

module.exports = mongoose.model('Component', schema);
