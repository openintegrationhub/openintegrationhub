/* eslint no-unused-vars: 0 */ // --> OFF

const co = require('co');
const Q = require('q');
const request = require('request');


function processTrigger(msg, cfg) {
  return co(function* gen() {
    const tokenOptions = {
      uri: 'https://login.acme/oauth2/v2.0/token',
      json: true,
      body: {
        client_id: 'admin',
        client_secret: 'secret',
      },
    };

    const [, newToken] = yield Q.ninvoke(request, 'post', tokenOptions);

    this.emit('updateKeys', {
      oauth: newToken,
    });

    const options = {
      uri: 'https://login.acme/oauth2/v2.0/contacts',
      json: true,
    };

    const [, body] = yield Q.ninvoke(request, 'get', options);

    return {
      body,
    };
  }.bind(this));
}

exports.process = processTrigger;
