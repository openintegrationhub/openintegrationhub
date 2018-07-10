require('../../src/util/nodemon-env').apply();
const conf = require('../../src/conf');

const basic = require('../../src/oidc/helper/basic-auth-header');
const rp = require('request-promise');

(async () => {

    try {

        // fetch service account access token
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

        let token = response.access_token;

        // introspect active service account access token
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

        // revoke service account access token
        console.log(await rp.post({
            uri: `${conf.getOidcBaseUrl()}/token/revocation`,
            headers: {
                Authorization: basic(
                    conf.oidc.serviceClient.client_id,
                    conf.oidc.serviceClient.client_secret,
                ),            
            },
            form: {
                token_type_hint: 'access_token',
                token,
            },
            json: true,
        }));

        // introspect inactive service account access token
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

        // fetch client access token
        response = await rp.post({
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

        token = response.access_token;

        // introspect active client access token
        response = await rp.post({
            uri: `${conf.getOidcBaseUrl()}/token/introspection`,
            headers: {
                Authorization: basic(
                    conf.oidc.serviceClient.client_id,
                    conf.oidc.serviceClient.client_secret,
                ),           
            },
            form: {
                token,
            },
            json: true,
        });

        console.log(response);

        // revoke service account access token
        await rp.post({
            uri: `${conf.getOidcBaseUrl()}/token/revocation`,
            headers: {
                Authorization: basic(
                    conf.oidc.serviceClient.client_id,
                    conf.oidc.serviceClient.client_secret,
                ),          
            },
            form: {
                token_type_hint: 'access_token',
                token,
            },
            json: true,
        });

        // introspect inactive client access token
        response = await rp.post({
            uri: `${conf.getOidcBaseUrl()}/token/introspection`,
            headers: {
                Authorization: basic(
                    conf.oidc.serviceClient.client_id,
                    conf.oidc.serviceClient.client_secret,
                ),             
            },
            form: {
                token,
            },
            json: true,
        });

        console.log(response);

    } catch (err) {
        console.log(err);
    }
})();
