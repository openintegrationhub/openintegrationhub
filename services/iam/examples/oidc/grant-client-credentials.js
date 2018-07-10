require('../../src/util/nodemon-env').apply();
const conf = require('../../src/conf');
const basic = require('../../src/oidc/helper/basic-auth-header');
const rp = require('request-promise');

(async () => {

    try {
        // get access token as client
        let response = await rp.post({
            uri: `${conf.getOidcBaseUrl()}/token`,
            headers: {
                Authorization: basic(
                    conf.oidc.serviceClient.client_id,
                    conf.oidc.serviceClient.client_secret,
                ),            
            },
            json: true,
            form: {
                grant_type: 'client_credentials',
            },
        });

        const token = response.access_token;
        // introspect client access token
        response = await rp.post({
            uri: `${conf.getOidcBaseUrl()}/token/introspection`,
            headers: {
                Authorization: basic(
                    conf.oidc.serviceClient.client_id,
                    conf.oidc.serviceClient.client_secret,
                ),            
            },
            json: true,
            form: {
                token,
            },
        });

        console.log(response);

    } catch (err) {
        console.log(err);
    }
})();
