const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const CONSTANTS = require('./../../constants');

const validateEmail = function(email) {
    return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email); // eslint-disable-line
};

const membershipsSchema = new Schema({
    role: {
        type: Schema.ObjectId, ref: 'role',
    },
    tenant: { type: Schema.ObjectId, ref: 'tenant' },
    permissions: [String],
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
    currentContext: membershipsSchema,
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
