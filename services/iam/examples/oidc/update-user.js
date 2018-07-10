require('../../src/util/nodemon-env').apply();
const rp = require('request-promise');
const jose = require('node-jose');
const conf = require('../../src/conf');

const basic = require('../../src/oidc/helper/basic-auth-header');

(async () => {

    try {
        const keys = await rp({
            uri: `${conf.getOidcBaseUrl()}/certs`,
            json: true,
        });

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
        const idToken = response.id_token;

        // get kid from header to verify signature
        const kid = jose.util.base64url
            .decode(idToken)
            .toString('utf8')
            .match(/sig.[^"]+/)[0];

        // select kid from keystore
        const keystore = await jose.JWK.asKeyStore(keys);
        const key = keystore.get(kid);

        // verify token
        const result = await jose.JWS.createVerify(key).verify(idToken);

        // take decoded  payload
        const user = JSON.parse(result.payload.toString());

        // use access token to access api and change user data
        response = await rp.patch({
            // send request to api
            uri: `${conf.getApiBaseUrl()}/users/${user.sub}`,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'x-auth-type': 'oidc',
            },
            body: {
                firstname: 'first',
            },
            json: true,
        });

        // check changes
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

        console.log(response.firstname);
        // revert changes
        response = await rp.patch({
            // send request to api
            uri: `${conf.getApiBaseUrl()}/users/${user.sub}`,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'x-auth-type': 'oidc',
            },
            body: {
                firstname: 'second',
            },
            json: true,
        });

        // check changes
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
        
        console.log(response.firstname);

    } catch (err) {
        console.log(err);
    }
})();
