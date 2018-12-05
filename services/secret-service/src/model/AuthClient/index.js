const mongoose = require('mongoose');
const owner = require('../schema/owner');
// const requestOptions = require('../schema/requestOptions');
const { OA1_TWO_LEGGED, OA2_AUTHORIZATION_CODE } = require('../../constant').AUTH_TYPE;

const { Schema } = mongoose;

const authClientBaseSchema = new Schema({
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
        enum: [OA1_TWO_LEGGED, OA2_AUTHORIZATION_CODE],
        required: true,
    },
    property: {},
}, {
    timestamps: true,
});

const AuthClient = mongoose.model('auth-client', authClientBaseSchema);

module.exports = {
    full: AuthClient,
    [OA1_TWO_LEGGED]:
        AuthClient.discriminator(`C_${OA1_TWO_LEGGED}`, new Schema({
            property: {
                consumerKey: {
                    type: String,
                    required: true,
                },
                consumerSecret: {
                    type: String,
                    required: true,
                },
                nonce: {
                    type: String,
                    required: true,
                },
                signature: {
                    type: String,
                    required: true,
                },
                signatureMethod: {
                    type: String,
                    required: true,
                },
                version: String,
            },

        })),

    [OA2_AUTHORIZATION_CODE]:
        AuthClient.discriminator(`A_${OA2_AUTHORIZATION_CODE}`, new Schema({
            property: {
                clientId: {
                    type: String,
                    required: true,
                },
                clientSecret: {
                    type: String,
                    required: true,
                },
                redirectUri: {
                    type: String,
                    required: true,
                },
                endpoint: {
                    start: {
                        type: String,
                        required: true,
                    },
                    exchange: {
                        type: String,
                        required: true,
                    },
                    refresh: {
                        type: String,
                        required: true,
                    },
                },
            },
        })),
};
