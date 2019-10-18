const rp = require('request-promise');
// const Logger = require('@basaas/node-logger');
const conf = require('../../../conf');

// const log = Logger.getLogger(`${conf.log.namespace}/key-adapter`, {
//     level: 'debug',
// });

module.exports = {
    async getKey(parameter) {
        const body = await rp.get({
            uri: `${conf.iam.apiBase}/tenants/${parameter}/key`,
            headers: {
                'x-auth-type': 'basic',
                authorization: `Bearer ${conf.iam.token}`,
            },
            json: true,
        });
        return body.key;
    },
    getKeyParameter(user) {
        return user.currentContext.tenant;
    },
};
