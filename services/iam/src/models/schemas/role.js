const mongoose = require('mongoose');

const { ROLE_TYPE } = require('../../constants');
const { PERMISSIONS, RESTRICTED_PERMISSIONS } = require('../../access-control/permissions');

const { Schema } = mongoose;

const RoleSchema = new Schema({
    name: {
        type: String,
    },
    type: {
        type: String,
        'enum': Object.keys(ROLE_TYPE),
        'default': ROLE_TYPE.TENANT,
    },
    isGlobal: {
        type: Boolean,
        default: false,
    },
    // TODO: should this really be a reference? It may cause a lot of DB lookups
    // permissions: [{
    //     type: Schema.ObjectId,
    //     ref: 'permission',
    // }],
    permissions: [{
        type: String,
        'enum': Object.keys(PERMISSIONS).concat(Object.keys(RESTRICTED_PERMISSIONS)),
    }],
    description: String,
    tenant: {
        type: Schema.ObjectId, ref: 'tenant',
    },
    scope: String,
}, {
    timestamps: true,
});

RoleSchema.index({ name: 1, tenant: 1 }, { unique: true });

module.exports = RoleSchema;
