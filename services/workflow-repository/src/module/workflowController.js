
const WorkflowDAO = require('../dao/workflows');
const FlowAPI = require('./flowApi');
const { STATUS } = require('../constant');

const WorkflowController = {

    start: async (workflowId) => {
        const workflow = await WorkflowDAO.findOne({
            _id: workflowId,
        });
        await WorkflowDAO.update({
            _id: workflowId,
        }, {
            status: STATUS.RUNNING,
        });
        await WorkflowController.processNextFlows(workflow, true);
    },

    stop: async (workflowId) => {
        const workflow = await WorkflowDAO.findOne({
            _id: workflowId,
        });
        for (const flow of workflow.flows) {
            if (flow.status === STATUS.STARTED) {
                await FlowAPI.stopFlow(flow.flowId);
                await WorkflowDAO.update({
                    _id: workflowId,
                }, {
                    status: STATUS.ABORTED,
                });
            }
        }
    },

    finishWorkflow: async (workflowId) => {
        await WorkflowDAO.update({
            _id: workflowId,
        }, {
            status: STATUS.FINISHED,
        });
    },

    processNextFlows: async (workflow, isStart, finishedFlowId) => {
        if (isStart) {
            const targetFlows = workflow.flows.filter(flow => flow.status === STATUS.READY && (!flow.dependencies || flow.dependencies.length === 0));
            if (targetFlows && targetFlows.length) {
                for (const flow of targetFlows) {
                    console.log('startFlow', flow.flowId);
                    await FlowAPI.startFlow(flow.flowId);
                }
            } else {
                await WorkflowController.finishWorkflow(workflow._id);
            }
        } else if (finishedFlowId) {
            const targetFlows = workflow.flows.filter(flow => flow.dependencies && flow.dependencies.find(dep => dep.id === finishedFlowId));
            if (targetFlows && targetFlows.length) {
                for (const flow of targetFlows) {
                    if (flow.status === STATUS.READY) {
                        await FlowAPI.startFlow(flow.flowId);
                    }
                }
            } else {
                await WorkflowController.finishWorkflow(workflow._id);
            }
        }
    },

    next: async ({ flowId }) => {
        const targetWorkflow = await WorkflowDAO.findOne({
            'flows.flowId': flowId,
            // status: STATUS.RUNNING,
        });

        if (targetWorkflow) {
            await WorkflowController.processNextFlows(targetWorkflow, false, flowId);
        }
    },

    setFlowState: async ({ flowId, status }) => {
        const targetWorkflow = await WorkflowDAO.findOne({
            'flows.flowId': flowId,
        });
        //
        // targetWorkflow.flows.forEach((flow) => {
        //     if (flow.flowId === flowId) {
        //         flow.status = status;
        //     }
        // });
        //
        // console.log('targetWorkflow', targetWorkflow.flows, flowId, status);

        await WorkflowDAO.update({
            _id: targetWorkflow._id,
            'flows.flowId': flowId,
        }, {
            'flows.$.status': status,

        });
    },

};


module.exports = WorkflowController;
