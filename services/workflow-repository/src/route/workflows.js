const express = require('express');
const logger = require('@basaas/node-logger');
const { isAdmin, can } = require('@openintegrationhub/iam-utils');
const { userHasWriteAccess } = require('../middleware/workflows');
const conf = require('../conf');
const { SCOPES, WORKFLOW_TYPES } = require('../constant');
const PERMISSIONS = require('../constant/permission');
const WorkflowDAO = require('../dao/workflows');
const WorkflowController = require('../module/workflowController');
const FlowAPI = require('../module/flowApi');

const log = logger.getLogger(`${conf.logging.namespace}/integratedApps`);

const router = express.Router();

router.get('/templates', async (req, res, next) => {
    let templates = [];

    try {
        const globalTemplates = await WorkflowDAO.find({
            type: WORKFLOW_TYPES.TEMPLATE,
            scope: SCOPES.GLOBAL,
        });
        templates = templates.concat(globalTemplates);
        if (req.user.tenant) {
            const tenantTemplates = await WorkflowDAO.find({
                tenant: req.user.tenant,
                type: WORKFLOW_TYPES.TEMPLATE,
                scope: SCOPES.TENANT,
            });
            templates = templates.concat(tenantTemplates);
        }
        return res.send({
            data: templates,
            meta: {},
        });
    } catch (err) {
        log.error(err);
        return next({
            status: 500,
        });
    }
});

router.get('/', async (req, res, next) => {
    try {
        const workflows = await WorkflowDAO.find({
            tenant: req.user.tenant,
            owner: req.user._id,
        });
        return res.send({
            data: workflows,
            meta: {},
        });
    } catch (err) {
        log.error(err);
        return next({
            status: 500,
        });
    }
});

router.post('/', can([PERMISSIONS.common.manageWorkflows]), async (req, res, next) => {
    const workflowData = req.body;
    workflowData.owner = req.user._id;

    if (!isAdmin(req.user)) {
        workflowData.tenant = req.user.tenant;
    }

    if (!isAdmin(req.user) && workflowData.scope === SCOPES.GLOBAL) {
        return next({
            status: 403,
            message: 'Global templates can only be created by an admin',
        });
    }

    try {
        const workflow = await WorkflowDAO.create({
            ...workflowData,
        });

        return res.send({
            data: workflow,
            meta: {},
        });
    } catch (err) {
        log.error(err, err.name);
        if (err.code === 11000) {
            return next({
                status: 400,
                message: err.errmsg,
            });
        }
        return next({
            status: 500,
            message: err,
        });
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const workflow = await WorkflowDAO.findOne({
            _id: req.params.id,
            $or: [
                {
                    tenant: req.user.tenant,
                },
                {
                    scope: SCOPES.GLOBAL,
                },
            ],
        });

        if (!workflow) {
            return res.sendStatus(404);
        }
        return res.send({
            data: workflow,
            meta: {},
        });
    } catch (err) {
        log.error(err);
        return next({
            status: 500,
        });
    }
});

router.post('/:id/start', async (req, res, next) => {
    try {
        const workflow = await WorkflowDAO.findOne({
            _id: req.params.id,
        });

        if (!workflow) {
            return res.sendStatus(404);
        }

        if (workflow.type === WORKFLOW_TYPES.TEMPLATE) {
            return res.sendStatus(400);
        }

        if (workflow.tenant !== req.user.tenant || workflow.owner !== req.user._id) {
            return res.sendStatus(403);
        }

        await WorkflowController.start(workflow._id);

        const startedWorkflow = await WorkflowDAO.findOne({
            _id: req.params.id,
        });

        return res.send({
            data: startedWorkflow,
            meta: {},
        });
    } catch (err) {
        log.error(err);
        return next({
            status: 500,
        });
    }
});

router.post('/:id/stop', async (req, res, next) => {
    try {
        const workflow = await WorkflowDAO.findOne({
            _id: req.params.id,
        });

        if (!workflow) {
            return res.sendStatus(404);
        }

        if (workflow.type === WORKFLOW_TYPES.TEMPLATE) {
            return res.sendStatus(400);
        }

        if (workflow.tenant !== req.user.tenant || workflow.owner !== req.user._id) {
            return res.sendStatus(403);
        }

        await WorkflowController.stop(workflow._id);

        const stoppedWorkflow = await WorkflowDAO.findOne({
            _id: req.params.id,
        });

        return res.send({
            data: stoppedWorkflow,
            meta: {},
        });
    } catch (err) {
        log.error(err);
        return next({
            status: 500,
        });
    }
});

router.post('/:id/clone', async (req, res, next) => {
    try {
        const workflow = await WorkflowDAO.findOne({
            _id: req.params.id,
            $or: [
                {
                    tenant: req.user.tenant,
                    scope: SCOPES.TENANT,
                },
                {
                    scope: SCOPES.GLOBAL,
                },
            ],
        });

        if (!workflow) {
            return res.sendStatus(404);
        }

        const clone = await WorkflowDAO.cloneFromTemplate(workflow._id, { owner: req.user._id, tenant: req.user.tenant });

        return res.send({
            data: clone,
            meta: {},
        });
    } catch (err) {
        log.error(err);
        return next({
            status: 500,
        });
    }
});

router.patch('/:id', userHasWriteAccess, async (req, res, next) => {
    const workflowData = req.body;

    if (!isAdmin(req.user)) {
        delete workflowData.tenant;
        delete workflowData.owner;
    }

    try {
        const targetWorkflow = await WorkflowDAO.findOne({
            _id: req.params.id,
        });

        console.log('OWNER??', req.user, targetWorkflow);
        console.log('Owner', targetWorkflow.owner.toString(), req.user._id.toString());

        if (targetWorkflow.scope === SCOPES.PRIVATE && targetWorkflow.owner !== req.user._id) {
            return next({
                status: 403,
            });
        }

        const workflow = await WorkflowDAO.update({
            _id: req.params.id,
        }, workflowData);
        return res.send({
            data: workflow,
            meta: {},
        });
    } catch (err) {
        log.error(err);
        return next({
            status: 400,
        });
    }
});

router.delete('/:id', userHasWriteAccess, async (req, res, next) => {
    try {
        await WorkflowDAO.delete({
            id: req.params.id,
        });
        return res.sendStatus(204);
    } catch (err) {
        log.error(err);
        return next({
            status: 500,
        });
    }
});

router.delete('/', can([PERMISSIONS.restricted.workflowDeleteAny]), async (req, res, next) => {
    let tenant = req.user.tenant;

    if (!isAdmin(req.user) && req.query.tenant) {
        tenant = req.query.tenant;
    }

    try {
        await WorkflowDAO.deleteAll(isAdmin(req.user) && req.query.all ? {} : { tenant });
        return res.sendStatus(204);
    } catch (err) {
        log.error(err);
        return next({
            status: 500,
        });
    }
});

module.exports = router;
