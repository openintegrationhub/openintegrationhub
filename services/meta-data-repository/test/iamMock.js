const nock = require('nock');
const token = require('./tokens');

module.exports = {

    setup: () => {
        const endpointPrefix = process.env.INTROSPECT_ENDPOINT_OIDC.substr(0, process.env.INTROSPECT_ENDPOINT_OIDC.lastIndexOf('/'));
        const endpointSuffix = process.env.INTROSPECT_ENDPOINT_OIDC.substr(process.env.INTROSPECT_ENDPOINT_OIDC.lastIndexOf('/'));

        nock(endpointPrefix)
            .persist()
            .post(endpointSuffix)
            .reply((uri, requestBody, cb) => {
                let tokenName = requestBody.split('=');
                tokenName = tokenName && tokenName[1]; // OIDC sends token as form, not json

                cb(null, [200, token[tokenName].value]);
                // ...
            });
    },

};
