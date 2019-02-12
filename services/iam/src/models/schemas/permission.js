const mongoose = require('mongoose');

const { Schema } = mongoose;

const PermissionSchema = new Schema({
    name: String,
    type: String,
    description: String,
    restricted: Boolean,
}, {
    timestamps: true,
});

module.exports = PermissionSchema;
