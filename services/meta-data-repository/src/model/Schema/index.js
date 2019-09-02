const mongoose = require('mongoose');
const owners = require('../_schema/owners');
const { buildBaseUrl } = require('../../transform');

const { Schema } = mongoose;
const { ObjectId } = Schema;
const schema = new Schema({
    name: {
        type: String,
    },
    domainId: {
        type: ObjectId,
        required: true,
    },
    description: String,
    uri: {
        type: String,
        unique: true,
        required: true,
    },
    value: {
        type: String,
        set(value) {
            if (!this.uri && JSON.parse(value).$id !== `${buildBaseUrl()}${this._conditions.uri}`) {
                throw new mongoose.Error.ValidatorError({ message: 'Schema $id must not be changed' });
            }

            return value;
        },
    },
    owners: {
        type: [owners],
    },
    tenant: String,
    public: Boolean,
    refs: {
        type: [String],
    },
}, {
    autoCreate: true,
    timestamps: true,
});

module.exports = mongoose.model('schema', schema);
