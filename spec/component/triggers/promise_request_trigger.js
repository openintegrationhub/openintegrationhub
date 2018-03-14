'use strict';

const Q = require('q');
const request = require('request');

exports.process = processTrigger;

function processTrigger(msg, cfg) {
    const options = {
        uri: 'http://promise_target_url:80/foo/bar',
        json: true
    };

    return Q.ninvoke(request, 'get', options)
        .spread((req, body) => body)
        .then((data) => ({
            body: data
        }));
}
