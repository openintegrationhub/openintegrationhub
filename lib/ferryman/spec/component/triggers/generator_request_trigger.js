'use strict';

const Q = require('q');
const request = require('request');

exports.process = processTrigger;

async function processTrigger(msg, cfg) {
    const options = {
        uri: 'http://promise_target_url:80/foo/bar',
        json: true
    };

    const [response, body] = await Q.ninvoke(request, 'get', options);

    return {
        body
    };
}
