import mongoose, { Schema, Document } from 'mongoose';
import * as _ from 'lodash';

export interface ModificationHistoryItem extends Document {
    user: string;
    operation: string;
    timestamp: string;
}

export interface DataObjectRef extends Document {
    applicationUid: string;
    recordUid: string;
    modificationHistory: ModificationHistoryItem[];
}

export interface DataObject extends Document {
    oihUid: string;
    modelId: string;
    content: any;
    refs: DataObjectRef[];
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
    refs: [refsSchema]
}, {
    timestamps: true
});

function dataObjectTransform (doc: DataObject, ret: DataObject) {
    const safeFields = ['id', 'oihUid', 'modelId', 'content', 'refs'];
    ret.id = doc.id;
    return _.pick(ret, safeFields);
}

dataObjectSchema.set('toJSON', {
    transform: dataObjectTransform
});

export default mongoose.model<DataObject>('DataObject', dataObjectSchema);
