require('../../src/util/nodemon-env').apply();
const conf = require('../../src/conf');

const basic = require('../../src/oidc/helper/basic-auth-header');
const rp = require('request-promise');
const CONSTANTS = require('../../src/constants');

const newServiceAccount = {
    username: 'service-workplace-api@basaas.com',
    password: '',
    firstname: 'sa',
    lastname: 'sa',
    phone: '',
    status: CONSTANTS.STATUS.ACTIVE,
    confirmed: true,
    role: CONSTANTS.ROLES.SERVICE_ACCOUNT,
};

(async () => {

    try {

        // fetch access token
        let response = await rp.post({
            uri: `${conf.getOidcBaseUrl()}/token`,
            headers: {
                Authorization: basic(
                    conf.oidc.serviceClient.client_id,
                    conf.oidc.serviceClient.client_secret,
                ),            
            },
            form: {
                scope: 'global',
                grant_type: 'password',
                username: conf.accounts.serviceAccount.username,
                password: conf.accounts.serviceAccount.password,
            },
            json: true,
        });

        const token = response.access_token;

        response = await rp.post({
            uri: `${conf.getApiBaseUrl()}/users`,
            headers: {
                Authorization: `Bearer ${token}`,
                'x-auth-type': 'oidc',
            },
            body: newServiceAccount,
            json: true,
        });
        console.log('ok');

    } catch (err) {
        console.log(err);
    }
})();
