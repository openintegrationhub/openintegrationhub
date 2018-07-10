require('../../src/util/nodemon-env').apply();
const rp = require('request-promise');
const jose = require('node-jose');
const conf = require('../../src/conf');

const basic = require('../../src/oidc/helper/basic-auth-header');

(async () => {

    try {
        // fetch public keys
        const keys = await rp({
            uri: `${conf.getOidcBaseUrl()}/certs`,
            json: true,
        });

        // get service client access and id token
        const response = await rp.post({
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

        const idToken = response.id_token;

        const kid = jose.util.base64url
            .decode(idToken)
            .toString('utf8')
            .match(/sig.[^"]+/)[0];

        const keystore = await jose.JWK.asKeyStore(keys);
        const key = keystore.get(kid);

        // verify id token
        const result = await jose.JWS.createVerify(key).verify(idToken);
        console.log(result.payload.toString());

    } catch (err) {
        console.log(err);
    }
})();
