const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema(
    {
        flowExecId: {
            type: String,
            unique: true,
            index: true,
        },
        flowId: {
            type: String,
            index: true,
        },
        started: {
            type: Number,
            required: true,
            default: 0,
        },
        succeeded: {
            type: Number,
            required: true,
            default: 0,
        },
        startedNodes: {
            type: [],
            required: true,
            default: [],
        },
        succeededNodes: {
            type: [],
            required: true,
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

class FlowStateDao {
    static async delete(flowExecId) {
        return this.deleteOne({
            flowExecId,
        });
    }

    static async upsertCount(flowId, flowExecId, incrementStarted, incrementSucceeded) {
        try {
            const state = await this.findOneAndUpdate(
                {
                    flowId,
                    flowExecId,
                },
                {
                    $inc: {
                        started: incrementStarted,
                        succeeded: incrementSucceeded,
                    },
                },
                {
                    new: true,
                    upsert: true,
                    runValidators: true,
                }
            ).lean();
            return state;
        } catch (err) {
            // retry on duplicate error
            if (err.code === 11000) {
                return this.upsertCount(flowId, flowExecId, incrementStarted, incrementSucceeded);
            }
            throw err;
        }
    }

    static async upsert(flowExecId, started, succeeded) {
        try {
            const state = await this.findOneAndUpdate(
                {
                    flowExecId,
                },
                {
                    $push: {
                        startedNodes: {
                            $each: started,
                        },
                        succeededNodes: {
                            $each: succeeded,
                        },
                    },
                },
                {
                    new: true,
                    upsert: true,
                    runValidators: true,
                }
            ).lean();
            return state;
        } catch (err) {
            // retry on duplicate error
            if (err.code === 11000) {
                return this.upsert(flowExecId, started, succeeded);
            }
            throw err;
        }
    }

    static async findByFlowExecId(flowExecId) {
        return this.findOne({ flowExecId });
    }
}

schema.loadClass(FlowStateDao);

const FlowStateModel = mongoose.model('flow-state', schema);

module.exports = FlowStateModel;
