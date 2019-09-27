import mongoose, { Schema, Document, Types } from 'mongoose';
import * as _ from 'lodash';

export interface IModificationHistoryItemDocument {
    user: string;
    operation: string;
    timestamp: string;
}

export interface IDataObjectRefDocument {
    applicationUid: string;
    recordUid: string;
    modificationHistory?: IModificationHistoryItemDocument[];
}

export interface IOwnerDocument extends Types.Subdocument {
    id: string;
    type: string;
}

export interface IDataObjectDocument extends Document {
    domainId: string;
    schemaUri: string;
    content: any;
    refs?: IDataObjectRefDocument[];
    owners?: IOwnerDocument[];
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
    domainId: {
        type: String
    },
    schemaUri: {
        type: String
    },
    content: {
        type: Schema.Types.Mixed
    },
    refs: [refsSchema],
    owners: [ownerSchema]
}, {
    timestamps: true
});

function dataObjectTransform (doc: IDataObjectDocument, ret: IDataObjectDocument) {
    const safeFields = ['id', 'domainId', 'schemaUri', 'content', 'refs', 'owners'];
    ret.id = doc.id;
    return _.pick(ret, safeFields);
}

dataObjectSchema.set('toJSON', {
    transform: dataObjectTransform
});

export default mongoose.model<IDataObjectDocument>('DataObject', dataObjectSchema);
