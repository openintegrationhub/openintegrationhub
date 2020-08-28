/* eslint no-unused-vars: 0 */ // --> OFF

const co = require('co');
const Q = require('q');
const request = require('request');


function processTrigger(msg, cfg) {
  return co(function* gen() {
    const options = {
      uri: 'http://promise_target_url:80/foo/bar',
      json: true,
    };

    const [response, body] = yield Q.ninvoke(request, 'get', options);

    return {
      body,
    };
  });
}

exports.process = processTrigger;
