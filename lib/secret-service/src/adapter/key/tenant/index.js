const fetch = require('node-fetch');

// const Logger = require('@basaas/node-logger');
const conf = require('../../../conf');

// const log = Logger.getLogger(`${conf.log.namespace}/key-adapter`, {
//     level: 'debug',
// });

module.exports = {
    async getKey(parameter) {
        const response = await fetch(
            `${conf.iam.apiBase}/tenants/${parameter}/key`,
            {
                headers: {
                    'x-auth-type': 'basic',
                    authorization: `Bearer ${conf.iam.token}`,
                },
            },
        );
        const body = await response.json();
        return body.key;
    },
    getKeyParameter(user) {
        return user.currentContext.tenant;
    },
};
