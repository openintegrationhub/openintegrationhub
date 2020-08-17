/* eslint no-unused-vars: 0 */ // --> OFF

const Q = require('q');
const request = require('request');


function processTrigger(msg, cfg) {
  const options = {
    uri: 'http://promise_target_url:80/foo/bar',
    json: true,
  };

  return Q.ninvoke(request, 'get', options)
    .spread((req, body) => body)
    .then(data => ({
      body: data,
    }));
}

exports.process = processTrigger;
