const { PERMISSIONS } = require('@openintegrationhub/iam-utils');

module.exports = {
    restricted: {
        workflowDeleteAny: PERMISSIONS.restricted['workflows.workflow.deleteAny'],
    },
    common: {
        manageWorkflows: PERMISSIONS.common['workflows.workflow.manage'],
    },
};
