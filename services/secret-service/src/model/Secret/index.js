const mongoose = require('mongoose');
const owner = require('../schema/owner');
const { TYPE } = require('../../constant').SECRET;

const { Schema } = mongoose;

const secretBaseSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    owner: {
        type: [owner],
        required: true,
    },
    type: {
        type: String,
        enum: Object.keys(TYPE),
        required: true,
    },
    data: {},
}, {
    timestamps: true,
});

const Secret = mongoose.model('secret', secretBaseSchema);

module.exports = {
    full: Secret,
    [TYPE.simple]: Secret.discriminator(TYPE.simple, new Schema({
        data: {
            username: {
                type: String,
                required: true,
            },
            passphrase: {
                type: String,
                required: true,
            },
        },
    })),
    [TYPE.apiKey]: Secret.discriminator(TYPE.apiKey, new Schema({
        data: {
            value: {
                type: String,
                required: true,
            },
            headerName: String,
        },
    })),
    [TYPE.oAuth2]: Secret.discriminator(TYPE.oAuth2, new Schema({
        data: {
            clientId: {
                type: String,
                required: true,
            },
            accessToken: String,
            refreshToken: {
                type: String,
                required: true,
            },
            refreshTokenUrl: {
                type: String,
                required: true,
            },
            scoped: String,
            expiresAt: String,
            flowType: String,
        },
    })),
};
