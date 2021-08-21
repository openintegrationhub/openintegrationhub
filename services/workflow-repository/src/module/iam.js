const iamLib = require('@openintegrationhub/iam-utils');

module.exports = {

    get middleware() {
        return iamLib.middleware;
    },

    hasOneOf: iamLib.hasOneOf,
    can: iamLib.can,
    hasAll: iamLib.hasAll,

};
