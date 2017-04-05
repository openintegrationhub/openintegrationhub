'use strict';

const co = require('co');
const Q = require('q');
const request = require('request');

exports.process = processTrigger;

function processTrigger(msg, cfg) {
    return co(function* gen() {
        const options = {
            uri: 'http://promise_target_url:80/foo/bar',
            json: true
        };

        const [response, body] = yield Q.ninvoke(request, 'get', options);

        return {
            body
        };
    });
}
