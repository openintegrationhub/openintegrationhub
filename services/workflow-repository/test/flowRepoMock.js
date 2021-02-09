const nock = require('nock');
const conf = require('../src/conf');
const token = require('./tokens');

module.exports = {

    setup: () => {
        const endpointPrefix = process.env.FLOW_API_ENDPOINT.substr(0, process.env.INTROSPECT_ENDPOINT_BASIC.lastIndexOf('/'));

        nock(endpointPrefix)
            .persist()
            .post(/flows\/.*\/.*/)
            .reply((uri, requestBody, cb) => {
                console.log('FLOWAPIMOCK', uri, requestBody);

                cb(null, [200, '']);
                // ...
            });
    },

};
