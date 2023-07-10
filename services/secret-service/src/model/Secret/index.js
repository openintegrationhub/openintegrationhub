const mongoose = require('mongoose');
const AuthClient = require('../AuthClient');
const owner = require('../schema/owner');
const { AUTH_TYPE } = require('../../constant');

const {
    SIMPLE,
    MIXED,
    API_KEY,
    OA1_TWO_LEGGED,
    OA1_THREE_LEGGED,
    OA2_AUTHORIZATION_CODE,
    SESSION_AUTH,
} = AUTH_TYPE;

const { Schema } = mongoose;

const secretBaseSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    owners: {
        type: [owner],
        required: true,
    },
    tenant: String,
    type: {
        type: String,
        enum: Object.keys(AUTH_TYPE),
        required: true,
    },
    domain: {
        type: String,
    },
    lockedAt: Date,
    encryptedFields: [],
    mixedProperties: {
        type: Object,
    },
    value: {},

    currentError: Schema.Types.Mixed,
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
    [MIXED]:
        Secret.discriminator(`S_${MIXED}`, new Schema({
            value: {
                payload: {
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
    [SESSION_AUTH]: Secret.discriminator(`S_${SESSION_AUTH}`, new Schema({
        value: {
            authClientId: {
                type: Schema.Types.ObjectId,
                required: true,
                validate: {
                    validator: (v) => new Promise((resolve) => {
                        AuthClient.full.findOne({ _id: v }, (err, doc) => {
                            if (err || !doc) {
                                resolve(false);
                            } else {
                                resolve(true);
                            }
                        });
                    }),
                    // Default error message, overridden by 2nd argument to `cb()` above
                    message: 'Auth client does not exist',
                },
            },
            accessToken: String,
            expires: String,
            inputFields: Schema.Types.Mixed, // TODO: Define discriminated Values based on user fields from the Auth Client
        },
    })),
    [OA1_TWO_LEGGED]: Secret.discriminator(`S_${OA1_TWO_LEGGED}`, new Schema({
        value: {
            expiresAt: String,
        },
    })),
    [OA1_THREE_LEGGED]: Secret.discriminator(`S_${OA1_THREE_LEGGED}`, new Schema({
        value: {
            authClientId: {
                type: Schema.Types.ObjectId,
                required: true,
                validate: {
                    validator: (v) => new Promise((resolve) => {
                        AuthClient.full.findOne({ _id: v }, (err, doc) => {
                            if (err || !doc) {
                                resolve(false);
                            } else {
                                resolve(true);
                            }
                        });
                    }),
                    // Default error message, overridden by 2nd argument to `cb()` above
                    message: 'Auth client does not exist',
                },
            },
            accessToken: {
                type: String,
                required: true,
            },
            accessTokenSecret: {
                type: String,
                required: true,
            },
            scope: String,
            expires: String,
            externalId: String,
        },
    })),
    [OA2_AUTHORIZATION_CODE]: Secret.discriminator(`S_${OA2_AUTHORIZATION_CODE}`, new Schema({
        value: {
            authClientId: {
                type: Schema.Types.ObjectId,
                required: true,
                validate: {
                    validator: (v) => new Promise((resolve) => {
                        AuthClient.full.findOne({ _id: v }, (err, doc) => {
                            if (err || !doc) {
                                resolve(false);
                            } else {
                                resolve(true);
                            }
                        });
                    }),
                    // Default error message, overridden by 2nd argument to `cb()` above
                    message: 'Auth client is not existing',
                },
            },
            refreshToken: {
                type: String,
            },
            accessToken: {
                type: String,
                required: true,
            },
            scope: String,
            expires: {
                type: String,
                required: true,
            },
            externalId: String,
        },
    })),

};
