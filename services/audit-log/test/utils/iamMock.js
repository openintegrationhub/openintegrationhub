const nock = require('nock');
const token = require('./tokens');

module.exports = {

    setup: () => {
        const endpointPrefix = process.env.INTROSPECT_ENDPOINT_BASIC.substr(0, process.env.INTROSPECT_ENDPOINT_BASIC.lastIndexOf('/'));
        const endpointSuffix = process.env.INTROSPECT_ENDPOINT_BASIC.substr(process.env.INTROSPECT_ENDPOINT_BASIC.lastIndexOf('/'));

        nock(endpointPrefix)
            .persist()
            .post(endpointSuffix)
            .reply((uri, requestBody, cb) => {
                const tokenName = requestBody.token;

                cb(null, [200, token[tokenName].value]);
                // ...
            });
    },

};
