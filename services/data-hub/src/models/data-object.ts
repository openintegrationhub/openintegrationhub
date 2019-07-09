import mongoose, { Schema, Document } from 'mongoose';
import * as _ from 'lodash';

export interface DataObjectRef extends Document {
    applicationUid: string;
    recordUid: string;
}

export interface DataObject extends Document {
    oihUid: string;
    modelId: string;
    content: any;
    refs: DataObjectRef[];
}

const refsSchema = new Schema({
    applicationUid: {
        type: String,
        required: true
    },
    recordUid: {
        type: String,
        required: true
    }
});

function dataObjectRefsTransform (doc: DataObject, ret: DataObject) {
    const safeFields = ['applicationUid', 'recordUid'];
    return _.pick(ret, safeFields);
}

refsSchema.set('toJSON', {
    transform: dataObjectRefsTransform
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
