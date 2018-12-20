const mongoose = require('mongoose');
const owner = require('../schema/owner');
const { AUTH_TYPE } = require('../../constant');

const {
    SIMPLE, API_KEY, OA1_TWO_LEGGED, OA2_AUTHORIZATION_CODE,
} = AUTH_TYPE;

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
        enum: Object.keys(AUTH_TYPE),
        required: true,
    },
    lockedAt: Date,
    value: {},
}, {
    timestamps: true,
});

const Secret = mongoose.model('secret', secretBaseSchema);

module.exports = {
    full: Secret,
    [SIMPLE]:
        Secret.discriminator(`S_${SIMPLE}`, new Schema({
            value: {
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
    [API_KEY]:
        Secret.discriminator(`S_${API_KEY}`, new Schema({
            value: {
                key: {
                    type: String,
                    required: true,
                },
                headerName: String,
            },
        })),
    [OA1_TWO_LEGGED]:
        Secret.discriminator(`S_${OA1_TWO_LEGGED}`, new Schema({
            value: {
                expiresAt: String,
            },
        })),
    [OA2_AUTHORIZATION_CODE]:
        Secret.discriminator(`S_${OA2_AUTHORIZATION_CODE}`, new Schema({
            value: {
                authClientId: {
                    type: Schema.Types.ObjectId,
                    required: true,
                },
                refreshToken: {
                    type: String,
                    required: true,
                },
                accessToken: {
                    type: String,
                    required: true,
                },
                scope: String,
                endpoint: {
                    token: {
                        type: String,
                        required: true,
                    },
                },
                expires: String,
                externalId: String,
            },
        })),
};
