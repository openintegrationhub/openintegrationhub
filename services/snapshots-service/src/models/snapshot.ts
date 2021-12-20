import mongoose, { Schema, Document, Types } from 'mongoose';
import * as _ from 'lodash';

export interface IOwnerDocument extends Types.Subdocument {
    id: string;
    type: string;
}

export interface ISnapshotDocument extends Document {
    flowId: string;
    stepId: string;
    flowExecId: string;
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
    flowId: {
        type: String,
        required: true
    },
    flowExecId: {
        type: String,
    },
    stepId: {
        type: String,
        required: true
    },
    snapshot: {
        type: Schema.Types.Mixed,
        default: {}
    },
    owners: [ownerSchema],
    tenant: String,
}, {
    timestamps: true
});

// @ts-ignore
snapshotSchema.index({flowId: 1, stepId: 1, flowExecId: 1}, {unique: true}); 

function snapshotTransform (doc: ISnapshotDocument, ret: ISnapshotDocument) {
    const safeFields = ['id', 'snapshot', 'flowId', 'stepId', 'flowExecId'];
    ret.id = doc.id;
    return _.pick(ret, safeFields);
}

snapshotSchema.set('toJSON', {
    transform: snapshotTransform
});

export default mongoose.model<ISnapshotDocument>('Snapshot', snapshotSchema);
