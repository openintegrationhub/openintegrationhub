const Logger = require('@basaas/node-logger');
const Workflow = require('../model/Workflow');
const { SCOPES, WORKFLOW_TYPES, ERROR_CODES } = require('../constant');

const conf = require('./../conf');

const auditLog = Logger.getAuditLogger(`${conf.logging.namespace}/WorkflowDao`);

module.exports = {

    async create(obj) {
        const workflow = new Workflow({ ...obj });
        await workflow.save();
        auditLog.info('workflow.create', { data: workflow.toJSON() });
        return workflow.toJSON();
    },
    async find(query = {}) {
        return Workflow.find(query)
            .lean();
    },
    async findOne(query) {
        return Workflow.findOne(query)
            .lean();
    },
    async cloneFromTemplate(workflowId, { owner, tenant }) {
        const workflowTemplate = await Workflow.findOne({
            _id: workflowId,
        })
            .lean();

        if (workflowTemplate.scope !== SCOPES.GLOBAL && workflowTemplate.tenant !== tenant) {
            return new Error(ERROR_CODES.TENANT_MISMATCH);
        }

        if (workflowTemplate.scope === SCOPES.PRIVATE && workflowTemplate.owner !== owner) {
            return new Error(ERROR_CODES.FORBIDDEN);
        }

        delete workflowTemplate._id;
        workflowTemplate.templateRef = workflowId;
        workflowTemplate.scope = SCOPES.PRIVATE;
        workflowTemplate.type = WORKFLOW_TYPES.DEFAULT;
        workflowTemplate.owner = owner;
        return module.exports.create(workflowTemplate);
    },
    async publishWorkflow(workflowId, { scope, tenant }) {
        const obj = {
            // isGlobal: scope === SCOPES.GLOBAL,
            type: WORKFLOW_TYPES.TEMPLATE,
        };
        if (scope && scope === SCOPES.TENANT && tenant) {
            obj.tenant = tenant;
            obj.scope = SCOPES.TENANT;
        }
        return module.exports.update({
            _id: workflowId,
        }, obj);
    },
    async update(query, obj) {
        const workflow = await Workflow.findOneAndUpdate(query, { $set: obj }, { new: true }).lean();
        auditLog.info('workflow.update', { data: { ...query, ...obj } });
        return workflow;
    },
    async delete({ id }) {
        await Workflow.deleteOne({ _id: id });
        auditLog.info('workflow.delete', { data: { _id: id } });
    },
    async deleteAll(query) {
        await Workflow.deleteMany(query);
        auditLog.info('workflow.deleteAll', { data: { ...query } });
    },

};
