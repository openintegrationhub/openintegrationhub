import mongoose, { Schema, Document } from 'mongoose';
import * as _ from 'lodash';

export interface ModificationHistoryItemDocument extends Document {
    user: string;
    operation: string;
    timestamp: string;
}

export interface DataObjectRefDocument extends Document {
    applicationUid: string;
    recordUid: string;
    modificationHistory: ModificationHistoryItemDocument[];
}

export interface OwnerDocument extends Document {
    id: string;
    type: string;
}

export interface DataObjectDocument extends Document {
    oihUid: string;
    modelId: string;
    content: any;
    refs: DataObjectRefDocument[];
    owners: OwnerDocument[];
}

const mofificationHistorySchema = new Schema({
    user: {
        type: String,
        required: true
    },
    operation: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        required: true
    }
}, {
    _id: false
});

const refsSchema = new Schema({
    applicationUid: {
        type: String,
        required: true
    },
    recordUid: {
        type: String,
        required: true
    },
    modificationHistory: [mofificationHistorySchema]
}, {
    _id: false
});

const ownerSchema = new Schema({
    id: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    }
}, {
    _id: false
});

const dataObjectSchema = new Schema({
    oihUid: {
        type: String,
        required: true,
        unique: true
    },
    modelId: {
        type: String,
        required: true
    },
    content: {
        type: Schema.Types.Mixed
    },
    refs: [refsSchema],
    owners: [ownerSchema]
}, {
    timestamps: true
});

function dataObjectTransform (doc: DataObjectDocument, ret: DataObjectDocument) {
    const safeFields = ['id', 'oihUid', 'modelId', 'content', 'refs', 'owners'];
    ret.id = doc.id;
    return _.pick(ret, safeFields);
}

dataObjectSchema.set('toJSON', {
    transform: dataObjectTransform
});

export default mongoose.model<DataObjectDocument>('DataObject', dataObjectSchema);
