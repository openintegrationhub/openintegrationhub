const rp = require('request-promise');
const conf = require('../../conf');

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
        return body;
    },
    getKeyParameter(user) {
        return user.currentContext.tenant;
    },
};
