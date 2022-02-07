const mongoose = require('mongoose');
const { Schema } = mongoose;

const specialFlagsSchema = new Schema({
    privilegedComponent: Boolean,
    _id: false
})

const ownersSchema = new Schema({
    id: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    _id: false
});

const schema = new Schema({
    artifactId: String,
    version: Number,
    repository: String,
    maintainer: String,
    actions: {},
    triggers: {},
    rating: {
      documentation: {},
      interoperability: {}
    },
    name: {
        type: String,
        maxlength: 50,
        required: true
    },
    description: {
        type: String,
        maxlength: 300
    },
    access: {
        type: String,
        enum: ['private', 'public'],
        default: 'private'
    },
    isGlobal: {
        type: Boolean,
        default: false
    },
    resources: {
        limits: {
            cpu: String,
            memory: String
        },
        requests: {
            cpu: String,
            memory: String
        }
    },
    active: {
      type: Boolean,
      default: false
    },
    descriptor: {
        type: Schema.Types.Mixed
    },
    distribution: {
        type: {
            type: String,
            enum: ['docker', 'slug'],
            default: 'docker',
            required: true
        },
        image: {
            type: String,
            maxlength: 300,
            required: function () {
                return this.distribution.type === 'docker';
            }
        },
        registrySecretId: {
            type: Schema.Types.ObjectId
        },
        slugUrl: {
            type: String,
            maxlength: 300,
            required: function () {
                return this.distribution.type === 'slug';
            }
        }
    },
    applicationUid: {
        type: String,
        maxlength: 100
    },
    logo: {
        type: String
    },
    tenant: String,
    owners: {
        type: [ownersSchema],
        required: true
    },

    specialFlags: {
        type: specialFlagsSchema,
    }
}, {
    timestamps: true
});

schema.set('toJSON', {
    transform(doc, ret) {
        ret.id = doc.id;
        delete ret._id;
        delete ret.__v;

        return ret;
    }
});

class Component {
    static findByOwner(owner) {
        return this.find({
            owners: {
                $elemMatch: {
                    type: owner.type,
                    id: owner.id,
                }
            }
        });
    }

    removeOwner({ id, type }) {
        id = id.toString();
        this.owners = this.owners.filter(owner => !(owner.id === id && owner.type === type));
    }
}

schema.loadClass(Component);

module.exports = mongoose.model('Component', schema);
