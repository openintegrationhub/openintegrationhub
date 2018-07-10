require('../../src/util/nodemon-env').apply();
const conf = require('../../src/conf');

const basic = require('../../src/oidc/helper/basic-auth-header');
const rp = require('request-promise');

// IMPORTANT: Enable "registration" first. See src/conf oidc settings

const newClient = {
    grant_types: ['client_credentials'],
    application_type: 'native',
    redirect_uris: [],
    response_types: [],
    client_name: 'a fresh client',
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

        // create oidc client
        response = await rp.post({
            uri: `${conf.getOidcBaseUrl()}/reg`,
            headers: {
                Authorization: `Bearer ${token}`,            
            },
            json: true,
            body: newClient,
        });

    } catch (err) {
        console.log(err);
    }
})();
