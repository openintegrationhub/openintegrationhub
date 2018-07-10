require('../../src/util/nodemon-env').apply();
const conf = require('../../src/conf');

const basic = require('../../src/oidc/helper/basic-auth-header');
const rp = require('request-promise');

(async () => {

    try {

        // fetch service account tokens
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

        const accessToken = response.access_token;
        // const idToken = response.id_token;

        // introspect access token
        response = await rp.post({
            uri: `${conf.getOidcBaseUrl()}/token/introspection`,
            headers: {
                Authorization: basic(
                    conf.oidc.serviceClient.client_id,
                    conf.oidc.serviceClient.client_secret,
                ),            
            },
            form: {
                token: accessToken,
            },
            json: true,
        });

        console.log(response);

        // userinfo service account access token
        response = await rp.post({
            uri: `${conf.getOidcBaseUrl()}/me`,
            headers: {
                Authorization: `Bearer ${accessToken}`,         
            },
            json: true,
            form: {
                accessToken,
            },
        });

        console.log(response);

    } catch (err) {
        console.log(err);
    }
})();
