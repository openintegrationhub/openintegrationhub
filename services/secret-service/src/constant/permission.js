const { PERMISSIONS } = require('@openintegrationhub/iam-utils');

module.exports = {
    restricted: {
        secretDeleteAny: PERMISSIONS.restricted["secrets.secret.deleteAny"],
        authClientDeleteAny: PERMISSIONS.restricted["secrets.authClient.deleteAny"],
    },
    common: {
        secretReadRaw: PERMISSIONS.common["secrets.secret.readRaw"],
        authClientReadRaw: PERMISSIONS.common["secrets.authClient.readRaw"],
    },
};
