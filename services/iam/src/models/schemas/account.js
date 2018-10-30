const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const CONSTANTS = require('./../../constants');

const validateEmail = function(email) {
    return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(.\w{2,3})+$/.test(email);
};

const membershipsSchema = new Schema({
    role: {
        type: String,
        'enum': Object.keys(CONSTANTS.MEMBERSHIP_ROLES),
        'default': CONSTANTS.MEMBERSHIP_ROLES.TENANT_GUEST,
    },
    tenant: { type: Schema.ObjectId, ref: 'tenant' },
}, {
    _id: false,
});

const schema = {
    username: {
        type: String,
        lowercase: true,
        index: { unique: true },
        required: true,
        validate: [validateEmail, CONSTANTS.ERROR_CODES.EMAIL_NOT_VALID],
    },
    
    firstname: { type: String, required: true, index: true },
    lastname: { type: String, required: true, index: true },
    phone: String,
    avatar: String,
    status: {
        type: String,
        'enum': [
            CONSTANTS.STATUS.ACTIVE,
            CONSTANTS.STATUS.DISABLED,
            CONSTANTS.STATUS.PENDING,
        ],
        'default': CONSTANTS.STATUS.ACTIVE,

    },
    confirmed: { type: Boolean, 'default': false },
    role: {
        type: String,
        'enum': [
            CONSTANTS.ROLES.USER,
            CONSTANTS.ROLES.ADMIN,
            CONSTANTS.ROLES.SERVICE_ACCOUNT,
        ],
        'default': CONSTANTS.ROLES.USER,
        
    },
    memberships: [membershipsSchema],
    permissions: [String],
};

const account = new Schema(schema, {
    timestamps: true,
    strict: true,
});

account.plugin(passportLocalMongoose);

const accountFull = new Schema({
    ...schema,
    hash: String,
    salt: String, 
}, {
    timestamps: true,
    strict: true,
});

module.exports.account = account;
module.exports.accountFull = accountFull;
