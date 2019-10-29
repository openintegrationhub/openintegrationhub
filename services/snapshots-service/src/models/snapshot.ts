import mongoose, { Schema, Document, Types } from 'mongoose';
import * as _ from 'lodash';

export interface IOwnerDocument extends Types.Subdocument {
    id: string;
    type: string;
}

export interface ISnapshotDocument extends Document {
    snapshot: any;
    owners?: IOwnerDocument[];
}

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

const snapshotSchema = new Schema({
    snapshot: {
        type: Schema.Types.Mixed,
        default: {}
    },
    owners: [ownerSchema]
}, {
    timestamps: true
});

function snapshotTransform (doc: ISnapshotDocument, ret: ISnapshotDocument) {
    const safeFields = ['id', 'snapshot'];
    ret.id = doc.id;
    return _.pick(ret, safeFields);
}

snapshotSchema.set('toJSON', {
    transform: snapshotTransform
});

export default mongoose.model<ISnapshotDocument>('Snapshot', snapshotSchema);
