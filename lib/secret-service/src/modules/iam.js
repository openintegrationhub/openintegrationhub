let iamLib = require('@basaas/iam-lib');

module.exports = {

    get middleware() {
        return iamLib.middleware;
    },

    hasOneOf: iamLib.hasOneOf,
    can: iamLib.can,
    hasAll: iamLib.hasAll,

};
