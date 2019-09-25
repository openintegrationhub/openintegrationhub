const mongoose = require('mongoose');
const owner = require('../schema/owner');

const { OA1_TWO_LEGGED, OA1_THREE_LEGGED, OA2_AUTHORIZATION_CODE } = require('../../constant').AUTH_TYPE;

const { Schema } = mongoose;

const authClientBaseSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    owners: {
        type: [owner],
        required: true,
    },
    preprocessor: String,
    tenant: String,
    type: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

const AuthClient = mongoose.model('auth-client', authClientBaseSchema);

module.exports = {
    full: AuthClient,
    [OA1_TWO_LEGGED]:
    AuthClient.discriminator(`C_${OA1_TWO_LEGGED}`, new Schema({
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
        verifier: String,
    })),
    [OA1_THREE_LEGGED]:
        AuthClient.discriminator(`C_${OA1_THREE_LEGGED}`, new Schema({
            appName: String,
            key: {
                type: String,
                required: true,
            },
            secret: {
                type: String,
                required: true,
            },
            nonce: String,
            signature: String,
            signatureMethod: String,
            expiration: String,
            endpoints: {
                request: {
                    type: String,
                    required: true,
                },
                authorize: {
                    type: String,
                    required: true,
                },
                access: {
                    type: String,
                    required: true,
                },
            },
            redirectUri: {
                type: String,
                required: true,
            },
        })),
    [OA2_AUTHORIZATION_CODE]:
        AuthClient.discriminator(`A_${OA2_AUTHORIZATION_CODE}`, new Schema({
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
            endpoints: {
                auth: {
                    type: String,
                    required: true,
                },
                token: {
                    type: String,
                    required: true,
                },
                userinfo: String,
                revocation: String,
                endSession: String,
            },
            predefinedScope: String,
        })),
};
