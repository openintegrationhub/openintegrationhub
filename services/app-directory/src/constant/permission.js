const { PERMISSIONS } = require('@openintegrationhub/iam-utils');

module.exports = {
    restricted: {
        appDeleteAny: PERMISSIONS.restricted["appDirectory.app.deleteAny"],
    },
    common: {
        manageApps: PERMISSIONS.common["appDirectory.app.manage"],
    },
};
