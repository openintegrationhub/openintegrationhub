import mongoose, { Schema, Document } from 'mongoose';
import * as _ from 'lodash';

export interface DataObject extends Document {
    oihUid: string;
    modelId: string;
    content: any;
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

const schema = new Schema({
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

function safeTransform (doc: DataObject, ret: DataObject) {
    const safeFields = ['id', 'oihUid', 'modelId', 'content', 'refs'];
    ret.id = doc.id;
    return _.pick(ret, safeFields);
}

schema.set('toObject', {
    transform: safeTransform
});
schema.set('toJSON', {
    transform: safeTransform
});

export default mongoose.model<DataObject>('DataObject', schema);
