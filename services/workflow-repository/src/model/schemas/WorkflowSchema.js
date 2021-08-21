const mongoose = require('mongoose');
const {
    STATUS, WORKFLOW_TYPES, DEPENDENCY_TYPES, SCOPES,
} = require('../../constant');

const { Schema } = mongoose;

const FlowObj = new Schema({

    type: String,
    id: String,

}, { _id: false });

const Flow = new Schema({
    flowId: { type: String, index: true },
    dependencies: [FlowObj],
    dependencyType: {
        type: String,
        enum: Object.keys(DEPENDENCY_TYPES),
        default: DEPENDENCY_TYPES.ALL,
    },
    status: {
        type: String,
        enum: [
            STATUS.FAILED,
            STATUS.RUNNING,
            STATUS.WORKING,
            STATUS.FINISHED,
            STATUS.READY,
        ],
        default: STATUS.READY,
    },
}, { _id: false });

const WorkflowSchema = new Schema({
    name: { type: String, index: true, required: true },
    description: String,
    type: {
        type: String,
        enum: Object.keys(WORKFLOW_TYPES),
        default: WORKFLOW_TYPES.DEFAULT,
    },
    scope: {
        type: String,
        enum: Object.keys(SCOPES),
        default: SCOPES.PRIVATE,
    },
    tenant: String,
    owner: String,
    locked: Boolean,
    status: {
        type: String,
        enum: Object.keys(STATUS),
        default: STATUS.READY,
    },
    flows: [Flow],
    version: String,
    templateRef: {
        type: Schema.ObjectId, ref: 'workflow',
    },
}, {
    timestamps: true,
});

module.exports = WorkflowSchema;
